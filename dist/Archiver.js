"use strict";

const archiver = require('archiver');

const fs = require('fs');

const filesize = require('filesize');
/**
 * Archiver
 * @type {Archiver}
 */


module.exports = class {
  /**
   *
   * @param type string 'zip' | 'tar'
   * @param fileName string
   * @param src string Source to compress
   * @param excludeList [] List of path to exclude
   */
  constructor(type, fileName, src, excludeList) {
    this.type = type;
    this.src = src;
    this.excludeList = excludeList;
    this.fileName = fileName;
  }
  /**
   * Compress
   * @param onSuccess fn(filesize)
   * @param onError fn(err)
   */


  compress(onSuccess, onError) {
    const archive = archiver(this.type, {});
    this.output = fs.createWriteStream(this.fileName); // On success

    this.output.on('close', () => {
      const fileSize = filesize(archive.pointer());
      onSuccess(fileSize);
    }); // On error

    archive.on('error', err => {
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

};