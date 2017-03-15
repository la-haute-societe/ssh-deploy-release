const path = require('path');

/**
 * Release
 * @type {{}}
 */
module.exports = class {

    constructor(options, defaultOptions) {
        this.options        = options;
        this.defaultOptions = defaultOptions;

        this.tag  = this.getReleaseTag();
        this.path = this.getReleasePath();
    }

    /**
     * Get release tag
     * @returns {*|string}
     */
    getReleaseTag() {
        let releaseTag = this.options.tag;

        // Execute function if needed
        if (typeof this.options.tag == 'function') {
            releaseTag = this.options.tag()
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
    getReleasePath() {
        return path.posix.join(
            this.options.deployPath,
            this.options.releasesFolder,
            this.tag
        );
    }


};