module.exports = {

    /**
     * Return upwardPath from downwardPath
     * @example return "../../.." for "path/to/something"
     * @param downwardPath
     * @returns {XML|string|void|*}
     */
    getReversePath(downwardPath) {
        return downwardPath.replace(/([^\/]+)/g, '..');
    },



    /**
     * Realpath
     * @param path
     * @returns {string}
     */
    realpath(path) {

        // Explode the given path into it's parts
        let arr = path.split('/') // The path is an array now

        path = [] // Foreach part make a check
        for (let k in arr) { // This is'nt really interesting
            if (arr[k] === '.') {
                continue
            }
            // This reduces the realpath
            if (arr[k] === '..') {
                /* But only if there more than 3 parts in the path-array.
                 * The first three parts are for the uri */
                if (path.length > 3) {
                    path.pop()
                }
            } else {
                // This adds parts to the realpath
                // But only if the part is not empty or the uri
                // (the first three parts ar needed) was not
                // saved
                if ((path.length < 2) || (arr[k] !== '')) {
                    path.push(arr[k])
                }
            }
        }

        // Returns the absloute path as a string
        return path.join('/')
    }
};