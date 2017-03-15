'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var archiver = require('archiver');
var fs = require('fs');
var filesize = require('filesize');

/**
 * Archiver
 * @type {Archiver}
 */
module.exports = function () {

    /**
     *
     * @param type string 'zip' | 'tar'
     * @param fileName string
     * @param src string Source to compress
     * @param excludeList [] List of path to exclude
     */
    function _class(type, fileName, src, excludeList) {
        _classCallCheck(this, _class);

        this.type = type;
        this.src = src;
        this.excludeList = excludeList;
        this.fileName = fileName;
    }

    /**
     * Comress
     * @param onSuccess fn(filesize)
     * @param onError fn(err)
     */


    _createClass(_class, [{
        key: 'compress',
        value: function compress(onSuccess, onError) {
            var archive = archiver(this.type, {});
            this.output = fs.createWriteStream(this.fileName);

            // On success
            this.output.on('close', function () {
                var fileSize = filesize(archive.pointer());
                onSuccess(fileSize);
            });

            // On error
            archive.on('error', function (err) {
                onError(err);
            });

            archive.pipe(this.output);
            archive.glob('**/*', {
                expand: true,
                cwd: this.src,
                ignore: this.excludeList,
                dot: true
            });
            archive.finalize();
        }
    }]);

    return _class;
}();