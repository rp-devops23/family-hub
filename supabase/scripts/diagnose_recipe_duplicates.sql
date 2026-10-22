-- ============================================================================
-- FAMILY HUB — Diagnostic des redondances de l'app Recettes
--
-- LECTURE SEULE : ces requêtes (SELECT) ne modifient rien.
-- Dans le SQL Editor de Supabase, l'éditeur n'affiche que le résultat de la
-- DERNIÈRE requête : exécutez-les UNE PAR UNE (sélectionnez le bloc, puis Run).
--
--   1. Vue d'ensemble          → combien de doublons par table
--   2. Doublons de noms        → exacts (à fusionner) et probables (à vérifier)
--   3. Doublons structurels    → même ingrédient 2x dans une recette, etc.
--   4. Éléments inutilisés     → ingrédients / tags / féculents / catégories orphelins
--
-- Règles de comparaison des noms : minuscules, espaces nettoyés, accents retirés.
--   « exact »    : mêmes noms après normalisation (ex. « Tomate » / « tomate  »)
--   « probable » : mêmes noms au pluriel près (ex. « Carotte » / « Carottes »)
-- Les « probables » sont à vérifier à la main : ce ne sont pas forcément des doublons.
-- ============================================================================


-- ============================================================================
-- 1. VUE D'ENSEMBLE
-- ============================================================================
with items as (
  select 'Ingrédients' as categorie, user_id, id, name_fr as libelle, created_at from ingredients
  union all select 'Tags', user_id, id, name_fr, created_at from tags
  union all select 'Féculents', user_id, id, name_fr, created_at from bases
  union all select 'Catégories d''ingrédients', user_id, id, name_fr, created_at from ingredient_categories
  union all select 'Recettes', user_id, id, name, created_at from recipes
),
norm as (
  select *,
    lower(btrim(regexp_replace(
      translate(libelle, 'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'),
      '\s+', ' ', 'g'))) as cle
  from items
),
loose as (
  select *, regexp_replace(cle, '[sx]$', '') as cle_large from norm
),
exacts as (
  select categorie, count(*) as lignes
  from loose group by categorie, user_id, cle having count(*) > 1
),
exacts_agg as (
  select categorie, count(*) as groupes, sum(lignes - 1) as a_supprimer
  from exacts group by categorie
),
probables as (
  select categorie, count(*) as groupes
  from (
    select categorie from loose
    group by categorie, user_id, cle_large having count(distinct cle) > 1
  ) p group by categorie
),
totaux as (
  select categorie, count(*) as total from items group by categorie
)
select
  t.categorie,
  t.total                              as nb_lignes,
  coalesce(e.groupes, 0)               as groupes_doublons_exacts,
  coalesce(e.a_supprimer, 0)           as lignes_en_trop_exactes,
  coalesce(p.groupes, 0)               as groupes_probables_a_verifier
from totaux t
left join exacts_agg e on e.categorie = t.categorie
left join probables  p on p.categorie = t.categorie
order by t.categorie;


-- ============================================================================
-- 2. DOUBLONS DE NOMS (détail)
-- `ids` et `libelles` sont dans le même ordre : le plus ancien en premier,
-- c'est celui que le nettoyage conservera.
-- ============================================================================
with items as (
  select 'Ingrédients' as categorie, user_id, id, name_fr as libelle, created_at from ingredients
  union all select 'Tags', user_id, id, name_fr, created_at from tags
  union all select 'Féculents', user_id, id, name_fr, created_at from bases
  union all select 'Catégories d''ingrédients', user_id, id, name_fr, created_at from ingredient_categories
  union all select 'Recettes', user_id, id, name, created_at from recipes
),
norm as (
  select *,
    lower(btrim(regexp_replace(
      translate(libelle, 'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'),
      '\s+', ' ', 'g'))) as cle
  from items
),
loose as (
  select *, regexp_replace(cle, '[sx]$', '') as cle_large from norm
)
select categorie, 'exact' as niveau, left(user_id::text, 8) as utilisateur, cle,
       count(*) as nb,
       string_agg(libelle, '  |  ' order by created_at, id) as libelles,
       string_agg(id::text, ', '   order by created_at, id) as ids
from loose
group by categorie, user_id, cle
having count(*) > 1

union all

select categorie, 'probable', left(user_id::text, 8), cle_large,
       count(*),
       string_agg(libelle, '  |  ' order by created_at, id),
       string_agg(id::text, ', '   order by created_at, id)
from loose
group by categorie, user_id, cle_large
having count(distinct cle) > 1

order by categorie, niveau, cle;


-- ============================================================================
-- 3. DOUBLONS STRUCTURELS
-- ============================================================================
-- Un même ingrédient listé plusieurs fois dans la même recette
select 'Ingrédient répété dans une recette' as categorie,
       r.name || ' → ' || i.name_fr         as element,
       count(*)                             as nb,
       string_agg(coalesce(nullif(btrim(ri.quantity), ''), '?') || ' ' || coalesce(ri.unit, ''), '  |  '
                  order by ri.sort_order, ri.id) as quantites,
       string_agg(ri.id::text, ', ' order by ri.sort_order, ri.id) as ids
from recipe_ingredients ri
join recipes r     on r.id = ri.recipe_id
join ingredients i on i.id = ri.ingredient_id
group by r.id, r.name, i.id, i.name_fr
having count(*) > 1

union all

-- La même recette planifiée deux fois le même jour
select 'Repas planifié en double',
       mp.planned_date::text || ' → ' || r.name,
       count(*),
       '',
       string_agg(mp.id::text, ', ' order by mp.created_at, mp.id)
from meal_plans mp
join recipes r on r.id = mp.recipe_id
group by mp.user_id, mp.recipe_id, mp.planned_date, r.name
having count(*) > 1

union all

-- Articles non cochés en double dans la liste de courses
select 'Article de courses en double',
       coalesce(min(i.name_fr), min(nullif(btrim(coalesce(si.name, si.custom_name)), ''))),
       count(*),
       string_agg(coalesce(nullif(btrim(si.quantity), ''), '?') || ' ' || coalesce(si.unit, ''), '  |  '
                  order by si.created_at, si.id),
       string_agg(si.id::text, ', ' order by si.created_at, si.id)
from shopping_items si
left join ingredients i on i.id = si.ingredient_id
where not coalesce(si.checked, false)
group by si.user_id,
         coalesce(si.ingredient_id::text, lower(btrim(coalesce(si.name, si.custom_name, ''))))
having count(*) > 1

order by categorie, element;


-- ============================================================================
-- 4. ÉLÉMENTS INUTILISÉS (candidats au nettoyage, à vérifier avant suppression)
-- ============================================================================
select 'Ingrédient jamais utilisé' as categorie, left(i.user_id::text, 8) as utilisateur,
       i.name_fr as libelle, i.id::text as id, i.created_at::date as cree_le
from ingredients i
where not exists (select 1 from recipe_ingredients ri where ri.ingredient_id = i.id)
  and not exists (select 1 from shopping_items si where si.ingredient_id = i.id)

union all
select 'Tag sans recette', left(t.user_id::text, 8), t.name_fr, t.id::text, t.created_at::date
from tags t
where not exists (select 1 from recipe_tags rt where rt.tag_id = t.id)

union all
select 'Féculent sans recette', left(b.user_id::text, 8), b.name_fr, b.id::text, b.created_at::date
from bases b
where not exists (select 1 from recipes r where r.base_id = b.id)

union all
select 'Catégorie sans ingrédient', left(c.user_id::text, 8), c.name_fr, c.id::text, c.created_at::date
from ingredient_categories c
where not exists (select 1 from ingredients i where i.category_id = c.id)

order by categorie, libelle;
