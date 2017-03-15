'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');

/**
 * Release
 * @type {{}}
 */
module.exports = function () {
    function _class(options, defaultOptions) {
        _classCallCheck(this, _class);

        this.options = options;
        this.defaultOptions = defaultOptions;

        this.tag = this.getReleaseTag();
        this.path = this.getReleasePath();
    }

    /**
     * Get release tag
     * @returns {*|string}
     */


    _createClass(_class, [{
        key: 'getReleaseTag',
        value: function getReleaseTag() {
            var releaseTag = this.options.tag;

            // Execute function if needed
            if (typeof this.options.tag == 'function') {
                releaseTag = this.options.tag();
            }

            // Just a security check, avoiding empty tags that could mess up the file system
            if (releaseTag == '') {
                releaseTag = this.defaultOptions.tag;
            }
            return releaseTag;
        }

        /**
         * Get releases path
         * @returns {string}
         */

    }, {
        key: 'getReleasePath',
        value: function getReleasePath() {
            return path.posix.join(this.options.deployPath, this.options.releasesFolder, this.tag);
        }
    }]);

    return _class;
}();