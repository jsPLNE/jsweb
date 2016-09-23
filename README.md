# jsWeb - Simple Web Server with Javascript

jsWeb is a program to simplify web api based on express development.
After installed jsweb, just write the express request handle js file and put them to the correctly directlry. Start with command:

```
  > jsweb [/path/to/site/home]
```

# Features

* Everythings of web site in single folder.
* Multiple port support, each port is a standalone process
* Auto reload, Add/Modify/Delete api file doesn't need restart server
* Async init script loaded before real api method load to prepare system like database object or connection
* Https support
* Virtual host support
* Mustache template support buildin
* Cluster support
* Parameter URL support
* TLS session resume support


# Installation

```
    $ sudo npm install jsweb -g
```

* `jsweb` is not a nodejs module but a system tools to run your web.

# Run the demos

```
    $ git clone https://github.com/jsplne/jsweb-demo
    $ jsweb jsweb-demo/static
    $ jsweb jsweb-demo/api-server
    $ jsweb jsweb-demo/vhost
```

# Namings

```
    name[(tag[;tag[...]])]
```

## tags for port folder

* `https`  This is a https port

## tags for root folder

* `api`   Root folder `.js` file treat as server side script, if `index.js` exists, website homepage will be the result of `index.js`

## tags for inside folder 

* `api`   Folder contain api script. all `.js` inside this folder will be called as api call, include subfolders.
* `param` Folder correspond URL position will be inteperate as req.params object member, folder name as the member name, URL path will be the value

## tags for api `.js` file

* GET    api will called for correspond http method, if omit, all method will called.
* POST
* PUT
* ... all valid HTTP method


# Runtime data structure

System information share with request callback via  : `req.jw`

```
    req.jw = {
        app : <express object>  // system object
    }
```


# Enable/Disable file

Set/clear file execute flag of files to enable/disable init file or web api file to be load.

# Directory structure (single site)

See [jsweb-demo](https://github.com/jsPLNE/jsweb-demo)


# https certificate file generate

```
    cd /path/to/https-port/config
    $ openssl genrsa -out jsweb.key 1024
    $ openssl req -new -key jsweb.key -out jsweb.ca
    $ openssl x509 -req -in jsweb.ca -signkey jsweb.key -out jsweb.cert
```

# Cluster support

Set port-config.json under the port folder with key/value: `"cluster" : true`

## port-config.json
```
{
    "cluster" : true,
    "tls" {
        "key"  : "/path/to/key/file",  default to 
        "cert" : "/path/to/cert/file",
        "ca"   : "/path/to/ca/file",
        "rejectUnauthorized" : true | false,
        "requestCert"        : true | false
    }
}
```

# About parameter URL

* `api's` priority is higher than param `param` folder**
* `index.js` under `param` folder will be called when url point to that folder
* `param` can set multiple level.


* `param` folder examples

```
  /root/org(param)/user(param)/device(param)/index.js
  /root/org(param)/user(param)/device(param)/index.js
```



# About Views

Put variables you want to reder within view to  `res.locals` and `res.render(...)`


# `req.jw` object

* `req.jw.port.home`
* `req.jw.port.port`
* `req.jw.port.protocol`
* `req.jw.port.tags`
* `req.jw.port.config`
* `req.jw.home`
* `req.jw.root`
* `req.jw.config`
* `req.jw.hostname`

# `<home>/jsweb-config`

* `debug`   : true or fasle
* `cluster` : true or fase
* `public`  : array
