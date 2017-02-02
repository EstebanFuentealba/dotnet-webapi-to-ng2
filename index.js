const fetch = require('node-fetch');
const cheerio = require('cheerio');
const ejs = require('ejs');
const fs = require('fs');
const interfaceTemplate = fs.readFileSync('./templates/template.interface.ejs', 'utf-8');

var apiUrl = process.argv[2] || ""

if(apiUrl == "")
    return ;
if (!fs.existsSync("./dist")){
    fs.mkdirSync("./dist");
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
            if(method == 'POST') {
                try {
                    let modelName = $(".content-wrapper >div > a[href^='/Help/ResourceModel?modelName=']").eq(0).text();
                    let parameters = [];
                    let imports = [];
                    $("table.help-page-table tbody tr").map(function(index, element) {
                        let name = $(this).find(".parameter-name").eq(0).text();
                        let type = $(this).find(".parameter-type").eq(0).text().trim();
                        let interfaceName = Format.parameterType(type).replace('[]','');
                        if($(this).find(".parameter-type a").length>0) {
                            if(imports.filter((p) => p.name == interfaceName ).length==0) {
                                imports.push({
                                    name: interfaceName
                                });
                            }
                        }
                        if(parameters.filter((p) => p.name == name ).length==0) {
                            parameters.push({
                                name: name,
                                type: Format.parameterType(type),
                            });
                        } 
                    });
                    var template = ejs.render(interfaceTemplate, {
                        className: modelName,
                        parameters,
                        imports
                    });
                    if(modelName) {
                        fs.writeFileSync(`./dist/${modelName}.interface.ts`, template, 'utf8');
                        console.log(`GENERATED: ${modelName}`);
                    }
                    
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
            default:
                return value.replace(/Collection of (.*)/g,'$1\[\]');
        }
    }
}