module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: [
          'node_modules/d3/d3.min.js',
          'node_modules/d3-tip/index.js',
          'node_modules/topojson/dist/topojson.min.js',
          'node_modules/jquery/dist/jquery.js',
          'node_modules/underscore/underscore.js',
          'node_modules/backbone/backbone.js',
          'node_modules/bootstrap-treeview/src/js/bootstrap-treeview.js'
        ],
        dest: 'js/libs.js',
      },
      extras: {
        src: [
          'node_modules/bootstrap/dist/css/bootstrap.css',
          'node_modules/bootstrap-treeview/src/css/bootstrap-treeview.js'
        ],
        dest: 'css/libs.css',
      },
    },


    copy: {
      main: {
        files: [
          // Fonts from bootstrap to dev and public
          {expand: true, src: ['node_modules/bootstrap/fonts/*'], dest: './fonts/', filter: 'isFile', flatten:true},
          {expand: true, src: ['node_modules/bootstrap/fonts/*'], dest: './public/fonts/', filter: 'isFile', flatten:true},
          // End fonts
          {expand: true, src: ['fonts/*'], dest: 'public/', filter: 'isFile'},
          {expand: true, src: ['geoJson/*'], dest: 'public/', filter: 'isFile'},
          {expand: true, src: ['php/*',  '!php/seed.php' , '!php/seed_queries.php'], dest: 'public/', filter: 'isFile'},
          {expand: true, src: ['js/*'], dest: 'public/', filter: 'isFile'},
          {expand: true, src: ['css/*'], dest: 'public/', filter: 'isFile'},
          {expand: true, src: ['index.html'], dest: 'public/', filter: 'isFile'},
        ],
      },
    },
  });



  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');


  grunt.registerTask('default', ['concat','copy']);

};