# Generate ngsi-context.jsonld

Use the context-file-generator from here: https://github.com/FIWARE/tutorials.Understanding-At-Context/tree/master/context-file-generator

# Serve Swagger UI

In this folder, run

```
docker run -d --rm --name swagger -p 8080:8080 -v ${PWD}:/model -e SWAGGER_JSON=/model/openapi.yml swaggerapi/swagger-ui
```

Docker required. In the git Bash on Windows, prepend `MSYS_NO_PATHCONV=1 `.

