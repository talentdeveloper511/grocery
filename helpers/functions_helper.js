var fs = require('fs');
var path = require("path");
var sharp = require('sharp');

var helperfunctions = {
    deleteFile: function (filepath) {
        //delete file from path
        if (fs.existsSync(filepath)) {
            fs.unlink(filepath, function (err) {
                // if no error, file has been deleted successfully
            });
        }
        return;
    },
    sharpFile: async function (files, width, height) {
        let totalFiles = files.length;
        let uploadedFiles = [];
        return new Promise(async (resolve, reject) => {
            await Promise.all(files.map(async (item, index) => {

                await this.createsharpfile(item, width, height).then(response => {

                    uploadedFiles.push(item.destination.replace('public/', '') + '/' + response);
                    //if (totalFiles - 1 == index)

                    return;
                })

            })
            )
            return resolve(uploadedFiles);
        })
    },
    createsharpfile: function (item, width, height) {
        return new Promise((resolve, reject) => {
            let filename = item.fieldname + '-' + Date.now() + '-resized.jpeg';
            return sharp(item.path)
                .resize(width, height)
                .jpeg({ quality: 100 })
                .toFile(
                    path.resolve(item.destination, filename)
                ).then(data => {

                    this.deleteFile(item.path)
                    return resolve(filename)
                }).catch(err => { console.log(err); return reject(err) });
        });
    }

}

module.exports = helperfunctions;