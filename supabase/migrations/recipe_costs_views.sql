-- ============================================================================
-- FAMILY HUB — Prix calculé des recettes (vues recipe_costs / recipe_ingredient_costs)
--
-- INSTANTANÉ de ce qui existe déjà dans la base de production : ces vues y sont déjà en place
-- (elles alimentent aussi le serveur MCP « family-hub-mcp »). Ce fichier les versionne dans le
-- dépôt, sans rien changer : les rejouer sur la base actuelle ne modifie pas leur comportement.
--
-- Prérequis (non recréés ici, déjà présents en production) : la table ingredient_prices
-- (prix des ingrédients : price, pack_qty, pack_unit g/ml/piece, price_per_unit calculé, source…),
-- remplie à partir des tickets de caisse Delhaize.
--
-- L'application affiche ce prix à la place de l'ancien niveau choisi à la main (price_range).
-- Une ligne n'est chiffrée que si la quantité est numérique ET que son unité est exactement
-- celle du paquet (g, ml ou piece) ; sinon son coût est inconnu et l'ingrédient est listé comme manquant.
-- security_invoker : chaque utilisateur ne voit que ses propres recettes (RLS).
-- ============================================================================

create or replace view recipe_ingredient_costs with (security_invoker = true) as
select
  ri.recipe_id,
  ri.ingredient_id,
  i.name_fr as ingredient,
  ri.quantity,
  ri.unit,
  p.price_per_unit,
  p.source,
  case
    when p.source = any (array['gratuit', 'negligeable']) then 0::numeric
    when ri.quantity ~ '^[0-9]+([.,][0-9]+)?$'
         and ri.unit = p.pack_unit
         and p.price_per_unit is not null
      then round(replace(ri.quantity, ',', '.')::numeric * p.price_per_unit, 2)
    else null::numeric
  end as cost
from recipe_ingredients ri
join ingredients i on i.id = ri.ingredient_id
left join ingredient_prices p on p.ingredient_id = ri.ingredient_id;

create or replace view recipe_costs with (security_invoker = true) as
select
  r.id as recipe_id,
  r.name,
  sum(c.cost) as known_cost,
  count(*) filter (where c.cost is null) as missing_count,
  string_agg(c.ingredient, ', ' order by c.ingredient) filter (where c.cost is null) as missing_ingredients
from recipes r
join recipe_ingredient_costs c on c.recipe_id = r.id
group by r.id, r.name;
