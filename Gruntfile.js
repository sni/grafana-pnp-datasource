module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({

    clean: ["dist"],

    copy: {
      src_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['**/*', '!**/*.js', '!**/*.scss', '!img/*'],
        dest: 'dist'
      },
      img_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['img/*'],
        dest: 'dist/src/'
      },
      dashboards_to_dist: {
        expand: true,
        src: ['dashboards/*'],
        dest: 'dist/'
      },
      pluginDef: {
        expand: true,
        src: [ 'src/plugin.json', 'README.md' ],
        dest: 'dist'
      }
    },

    babel: {
      options: {
        sourceMap: true,
        presets:  ['es2015']
      },
      dist: {
        options: {
          plugins: ['transform-es2015-modules-systemjs', 'transform-es2015-for-of']
        },
        files: [{
          cwd: 'src',
          expand: true,
          src: ['**/*.js'],
          dest: 'dist',
          ext:'.js'
        }]
      },
      distTestNoSystemJs: {
        files: [{
          cwd: 'src',
          expand: true,
          src: ['**/*.js'],
          dest: 'dist/test',
          ext:'.js'
        }]
      },
      distTestsSpecsNoSystemJs: {
        files: [{
          expand: true,
          cwd: 'spec',
          src: ['**/*.js'],
          dest: 'dist/test/spec',
          ext:'.js'
        }]
      }
    },

    watch: {
      rebuild_all: {
        files: ['src/**/*', 'plugin.json'],
        tasks: ['default'],
        options: {spawn: false}
      }
    }
  });

  grunt.registerTask('default', ['clean', 'copy:src_to_dist','copy:img_to_dist', 'copy:pluginDef', 'copy:dashboards_to_dist', 'babel']);
};
