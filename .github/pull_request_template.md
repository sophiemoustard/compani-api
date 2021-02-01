- [ ] Mon code est testé unitairement
- Tests intégrations: (barrer ce qui n'est pas utile)
  - Ce n'est pas une ancienne route utilisée par le mobile
      - [ ] J'ai bien fait les tests
  - C'est une ancienne route utilisée par le mobile
    - J'ai changé ce qu'acceptait ou ce que renvoyait la route (noms de champs, format, conditions)
      - [ ] J'ai fait de nouveaux tests sans modifier les anciens pour s'assurer que les anciennes versions du mobile
      fonctionnent

- [ ] Mes changements n'impactent pas une route utilisée par l'autre plateforme (mobile/webapp)
- Mes changements impactent une route utilisée par l'autre plateforme (mobile/webapp):
  - [ ] J'ai décrit dans le cas d'usage les choses a tester sur l'autre plateforme
  - Je n'ai pas fait de breaking change :
    - [ ] Je n'ai pas changé les droits de la route
    - [ ] Je n'ai pas changé les droits dans le fichier rights.js
    - [ ] Je n'ai pas fait de changement sur le prehandler qui implique le mobile
    - [ ] Je n'ai pas changé le type d'un paramètre ou enlevé des valeurs possibles
  - J'ai supprimé une route :
    - [ ] Les anciennes versions mobiles + l'actuelle ne l'utilise pas
  - J'ai renommé une route :
    - [ ] La route n'est pas utilisée par le mobile (si la route est utilisée en mobile: ne pas la renommer et plutôt
    créer une nouvelle route utilisée par la WEBAPP et toutes les nouvelles versions mobiles)
  - J'ai ajoute un champ possible dans la route :
    - [ ] J'ai géré le cas ou on ne l'envoie pas
  - J'ai rendu obligatoire un champs de la route :
    - [ ] Il est toujours envoyé par le mobile (même par les anciennes versions)
  - J'ai retiré un champ possible dans la route :
    - [ ] Les anciennes versions mobiles + l'actuelle ne l'envoient pas
  - J'ai supprimé un retour/un champs du retour de la route :
    - [ ] Les anciennes versions mobiles + l'actuelle n'utilise pas ce retour

- J'ai changé un modele :
  - J'ai ajoute un champ possible :
    - [ ] J'ai géré le cas ou on ne l'envoie pas
  - J'ai rendu obligatoire un champs :
    - [ ] Il est toujours envoyé par le mobile (même par les anciennes versions)
  - J'ai retiré un champ possible :
    - [ ] Les anciennes versions mobiles + l'actuelle ne l'envoient pas

- [ ] Je n'ai pas changé de constante

- Périmetre interface : 

- Périmetre roles : 

- Cas d'usage : 
