# App and Apache configuration #
This app requires for Cross-Origin Resource Sharing (CORS) to be enabled at both the application level (i.e. when performing Ajax requests), and at the Apache web server level.

As per Zendesk documentation, any requests to Orpheus API from the app have to include the "cors" property:

```javascript
var settingsOrpheus = {
        url: orpheusUrl,
        cors: true,
        type: 'GET',
        dataType: 'json'
    };

client.request(settingsOrpheus).then(
    function (data) {
        console.log(data);
    }, function (response) {
        console.log(response);
    }
);
```

Lastly, Zendesk domain needs to be whitelisted in the Apache configuration file.
This file is located under the Apache installation folder:
```apache2/sites-available/25-orpheus-prod.ds.lib.cam.ac.uk-ssl.conf``` (for production environment); ```apache2/sites-available/25-orpheus-dev.ds.lib.cam.ac.uk-ssl.conf``` for development environment.

Add the following line to the configuration file
```
# For development environment
Header Set Access-Control-Allow-Origin "https://camacuk1470327064.zendesk.com"
```

```
# For production environment
Header Set Access-Control-Allow-Origin "https://camacuk.zendesk.com"
``` 
    