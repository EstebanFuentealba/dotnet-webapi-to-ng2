const fetch = require('node-fetch');
const cheerio = require('cheerio');
const ejs = require('ejs');
const fs = require('fs');
const interfaceTemplate = fs.readFileSync('./templates/template.interface.ejs', 'utf-8');
const enumTemplate = fs.readFileSync('./templates/template.enum.ejs', 'utf-8');

var apiUrl = process.argv[2] || ""
let interfaces = [];
if(apiUrl == "")
    return ;
if (!fs.existsSync("./dist")){
    fs.mkdirSync("./dist");
}
function resourceModel(resourceName) {
    return fetch(`${apiUrl}/Help/ResourceModel?modelName=${resourceName}`)
                .then(function(response) {
                    return response.text()
                }).then(function(modelText) {
                    let $ = cheerio.load(modelText);
                    let parameters = [];
                    let imports = [];
                    $("table.help-page-table tbody tr").map(function(index, element) {
                        let name = $(this).find(".parameter-name").eq(0).text();
                        let type = $(this).find(".parameter-type").eq(0).text().trim();

                        //let nameEnum = $(this).find(".enum-name").eq(0).text();
                        //let valueEnum = $(this).find(".enum-value").eq(0).text().trim();


                        let interfaceName = Format.parameterType(type).replace('[]','');
                        if($(this).find(".parameter-type a").length>0) {
                            if(imports.filter((p) => p.name == interfaceName ).length==0) {
                                imports.push({
                                    name: interfaceName
                                });
                                if(interfaces.findIndex( name => name == resourceName) == -1) {
                                    interfaces.push(resourceName);
                                    resourceModel(interfaceName);
                                }
                                
                            }
                        }
                        if(parameters.filter((p) => p.name == name ).length==0) {
                            parameters.push({
                                name: name,
                                type: Format.parameterType(type),
                                isClass: $(this).find(".parameter-type a").length>0,
                                isInterface: true,
                                isEnum: false
                            });
                        }
                        /*
                        if(parameters.filter((p) => p.name == nameEnum ).length==0) {
                            parameters.push({
                                name: nameEnum,
                                value: valueEnum,
                                isClass: $(this).find(".parameter-type a").length>0,
                                isEnum: true
                            });
                        } */
                    });
                    
                    //let isInterface = true;
                    var template = ejs.render(interfaceTemplate, {
                        className: resourceName,
                        parameters,
                        imports
                    });
                    /*
                    if(parameters.filter((a) => {
                        return a.isEnum;
                    }).length>0) {
                        template = ejs.render(enumTemplate, {
                            className: resourceName,
                            parameters
                        });
                        isInterface = false;
                    } */
                    
                    if(resourceName) {
                        //if(isInterface){
                            fs.writeFileSync(`./dist/I${resourceName}.ts`, template, 'utf8');
                        /*} else {
                            fs.writeFileSync(`./dist/enum/${resourceName}.ts`, template, 'utf8');
                        }*/
                        console.log(`GENERATED: ${resourceName}`);
                    }
                });;
}
fetch(`${apiUrl}/Help`)
  .then(function(response) {
    return response.text()
  }).then(function(body) {
    let $ = cheerio.load(body);
    let api = [];
    $(".api-name a").map((index, element) => {
        let href = element.attribs.href;
        fetch(`${apiUrl}${href}`).then(function(response) {
            return response.text()
        }).then(function(detail) {
            let $ = cheerio.load(detail);
            let [ fullPath, method, resource, extraPath ] = /(.[^\ ]*) api\/(.[^\/]*)\/?(.*)?/.exec($("h1").text());
            if( typeof extraPath === undefined) {
                //console.log(`${method}: ${resource}`);
            } else {
                //console.log(`${method}: ${resource} ---- ${extraPath}`);
            }
            if(method == 'POST' || method == 'GET') {
                try {
                    let modelName = $(".content-wrapper >div > a[href^='/Help/ResourceModel?modelName=']").eq(0).text();

                    resourceModel(modelName)
                    
                    
                } catch(e) {
                    console.log("error", e)
                }
            }
        });
    });
  })


class Format {
    static parameterType(value) {
        switch(value) {
            case 'globally unique identifier':
                return 'string';
            case 'integer':
                return 'number';
            case 'date':
                return 'Date';  
            default:
                return value.replace(/Collection of (.*)/g,'$1\[\]');
        }
    }
}