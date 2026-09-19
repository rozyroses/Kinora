# Kinora Supabase

Kinora stores private creative data in Supabase.

## Core tables

- `profiles`
- `characters`
- `character_references`
- `projects`
- `generations`
- `project_assets`

## Private storage buckets

- `character-references`
- `generations`
- `project-assets`

All storage object paths must begin with the authenticated user's UUID:

```
<user-id>/<file-or-folder-path>
```

Example:

```
7f...a2/bijou/front-reference.webp
```

Row Level Security is enabled on all application tables. Storage access is also limited to the authenticated user's UUID folder.
