# jsWeb - Simple Web Server with Javascript

jsWeb is a program to simplify web api based on express development.
After installed jsweb, just write the express request handle js file and put them to the correctly directlry. Start with command:

```
  > jsweb [/path/to/site/home]
```

# Features

* Everythings of the site in single folder.
* Multiple port support, each port is a standalone process
* Auto reload, Add/Modify/Delete api file doesn't need restart server
* Plugins load before real api method load to prepare system like database object or connection


** NOTICE for windows user: use `#` instead `::` as api folder prefix delimiter**


# Step by step

## Step 1 : Install jsweb as system command
```
    > sudo npm install jsweb -g
```
## Step 2 : Test if jsweb install correctly

```
   > jsweb
   Can not find any directory contain jsWeb at : /home/usersrc/jsweb
   Please visit https://github.com/jsplne/jsweb for more details.
   
```

## Step 3 : Create your app directory or get demos
```
   get demo project from https://github.com/jsplne/jsweb-demo-linux
   get demo project from https://github.com/jsplne/jsweb-demo-windows
```

## Step 4 : Run
```
  > jsweb [/path/to/web/site/home]
```

## Step 5 : Test the result
```
  > wget -q -O- "http://localhost:8000/api/hello"
```


# Namings

## API folder name

By default every file inside the `<home>` folder is a static web site.
To make a folder contain api js file, just add `api::` to that folder name. Somethings like `api::api` will map this folder to `http://host:port/api/*`

## API method name

```
   <api file name> = <api>[<[http method]>].js
             <api> = the last section of url path
     <http method> = standand http method like GET/POST..., default to GET method.
```

* For example `get-system-id.js` create api of `/get-system-id` api to take response of http GET of `/get-system-id`.
* For example `upload[POST].js` create api of `/upload` api to take response of http POST to `/upload`.


# Runtime data structure

System information share with request callback via  : `req.jw`

```
    req.jw = {
        app : <express object>  // system object
               // object below is create by demo init program
        db : {
            pg    : <function to access Postgresql>
            mysql : <function to access Mysql>
            mssql : <function to access Sql server>
        }
    }
```


# Enable/Disable file

Set/clear file execute flag of files to enable/disable init file or web api file to be load.

# API home directory structure (demos/api-root-test-simple)

```
  <API HOME> +
             |
             +--"8000"
             |     +------ config
             |     |        +-- jsweb-config.json
             |     |
             |     +------ init
             |     |        +-- 01-db-pg.js     // for Postgresql
             |     |        +-- 02-db-mssql.js  // for Sql server
             |     |        +-- 02-db-mysql.js  // for Mysql
             |     |
             |     +------ root
             |              +-- api::test           // in windows, use 'api#test', linux work's for both
             |              |      +-- hello.js     // http://localhost:8000/api/test/hello
             |              |      +-- echo.js      // http://localhost:8000/api/test/echo
             |              |      +-- db-query.js  // http://localhost:8000/api/test/db-query
             |              |      +-- other
             |              |          +-- hello.js     // http://localhost:8000/api/test/other/hello
             |              |          +-- echo.js      // http://localhost:8000/api/test/other/echo
             |              +-- index.html
             |              +-- others
             |                    +-- others
             +--<port 2>
             | 
             ...

```
