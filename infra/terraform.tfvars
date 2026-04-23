# ─────────────────────────────────────────────────────
# terraform.tfvars — fill in your actual values
# DO NOT commit this file with real secrets to git.
# Add terraform.tfvars to .gitignore.
# ─────────────────────────────────────────────────────

resource_group_name = "rg-recipe-ui"
location            = "switzerlandnorth"
environment         = "development"
app_name            = "recipe-ui"

# Must be globally unique across all Azure customers
webapp_name = "recipe-ui-dev"

# Must be globally unique, 5-50 alphanumeric chars only
acr_name = "recipewebappacrdev"

acr_sku         = "Basic"      # Upgrade to Standard/Premium for geo-replication
app_service_sku = "B1"       # P1v3 minimum recommended for production + slots

image_name     = "nginx:stable-alpine"
spring_profile = "dev"

