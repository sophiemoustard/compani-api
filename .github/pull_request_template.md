### TESTS
- [ ] Mon code est testé unitairement
- Tests intégrations :
  - Ce n'est pas une ancienne route utilisée par les app mobiles
      - [ ] J'ai bien fait les tests
  - C'est une ancienne route utilisée par une des app mobiles
    - J'ai changé ce qu'acceptait ou ce que renvoyait la route (noms de champs, format, conditions)
      - [ ] J'ai fait de nouveaux tests sans modifier les anciens pour s'assurer que les anciennes versions des
      app mobiles fonctionnent

### FONCTIONNALITÉS APP MOBILES
- Si mes changements impactent l'application formation :
  - [ ] J'ai testé que les anciennes versions maintenues fonctionnent toujours (a minima):
    - [ ] Affichage des pages explorer/mes formations/About/CourseProfile
    - [ ] Inscription a une formation e-learning
    - [ ] Possibilité de faire une activité

- Si mes changements impactent l'application erp :
  - [ ] J'ai testé que les anciennes versions maintenues fonctionnent toujours

### MODIFICATIONS SUR LES ROUTES
- [ ] Mes changements n'impactent pas une route utilisée par les autres plateformes (mobile/webapp)
- Mes changements impactent une route utilisée par les autres plateformes (mobile/webapp):
  - [ ] J'ai décrit dans le cas d'usage les choses à tester sur l'autre plateforme
  - Je n'ai pas fait de breaking change :
    - [ ] Je n'ai pas changé les droits de la route
    - [ ] Je n'ai pas changé les droits dans le fichier rights.js
    - [ ] Je n'ai pas fait de changement sur le prehandler qui implique le mobile
    - [ ] Je n'ai pas changé le type d'un paramètre ou enlevé des valeurs possibles
    - Justification des breaking changes s'il y en a:
  - J'ai supprimé une route :
    - [ ] Les anciennes versions mobiles + les actuelles ne l'utilisent pas
  - J'ai renommé une route :
    - [ ] La route n'est pas utilisée par les app mobiles 
      (si la route est utilisée en mobile: ne pas la renommer et plutôt créer une nouvelle route utilisée par la WEBAPP
      et toutes les nouvelles versions mobiles)
  - J'ai ajouté un champ possible dans la route :
    - [ ] J'ai géré le cas ou on ne l'envoie pas
  - J'ai rendu obligatoire un champs de la route :
    - [ ] Il est toujours envoyé par les app mobiles (même par les anciennes versions)
  - J'ai retiré un champ possible dans la route :
    - [ ] Les anciennes versions mobiles + les actuelles ne l'envoient pas
  - J'ai supprimé un retour/un champs du retour de la route :
    - [ ] Les anciennes versions mobiles + les actuelles n'utilisent pas ce retour

### MODIFICATIONS SUR LES MODÈLES
- J'ai changé un modèle :
  - J'ai ajoutê un champ possible :
    - [ ] J'ai géré le cas ou on ne l'envoie pas
  - J'ai rendu obligatoire un champs :
    - [ ] Il est toujours envoyé par le mobile (même par les anciennes versions)
  - J'ai retiré un champ possible :
    - [ ] Les anciennes versions mobiles + l'actuelle ne l'envoient pas

### CONSTANTES ET VARIABLE D'ENV
- [ ] Je n'ai pas changé de constante

- J'ai ajouté une variable d'environnement :
  - [ ] J'ai précisé sur le slite de MES et MEP les modifications faites


### POUR TESTER LA PR
- Périmetre interface : 

- Périmetre roles : 

- Cas d'usage : 
