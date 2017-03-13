#!/bin/env node

var os     = require('os');
var spawn  = require('child_process').spawn;
var Q      = require('q');                               // https://github.com/kriskowal/q
var ffmpeg = require('fluent-ffmpeg');                   // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
var argv   = require('minimist')(process.argv.slice(2)); // https://github.com/substack/minimist
var mime   = require('mime-types');                      // https://github.com/jshttp/mime-types
var find   = require('find');                            // https://github.com/yuanchuan/find
var mkdirp = require('mkdirp');                          // https://github.com/substack/node-mkdirp
var rimraf = require('rimraf');                          // https://github.com/isaacs/rimraf
var im     = require('imagemagick');                     // https://github.com/rsms/node-imagemagick

var resolutions = {
	   '4k': '3840x2160',
	'1080p': '1920x1080',
	 '720p': '1280x720',
	 '480p': '852x480',
	 '360p': '480x360',
	 '240p': '320x240',
};

var global = {
	txtFileList: [],
	frameCount: 0,
	fps: 0,
	tmppath: os.tmpdir()+'/ascii2movie',
	font: {
		family: __dirname+'/fonts/ttf-bitstream-vera-1.10/VeraMono.ttf',
		color: 'white',
		background: 'black',
		rendersize: '720p'
	},
	pcount: 100,
	mp3duration: 0,
	zeroPadding: 0
};

var init = function (){
	global.help            = argv.help       || false;
	global.txtpath         = argv.txtpath    || false;
	global.mp3file         = argv.mp3file    || false;
	global.title           = argv.title      || "ASCII Movie";
	global.pcount          = argv.pcount     || global.pcount;
	global.font.family     = argv.fontfamily || global.font.family;
	global.font.color      = argv.fontcolor  || global.font.color;
	global.font.background = argv.background || global.font.background;
	global.font.rendersize = argv.rendersize || global.font.rendersize;
	global.font.rendersize = resolutions[global.font.rendersize.trim()];

	if (!global.txtpath || !global.mp3file || argv.help) {
		usage();
	} else {
		startProcessing();
	}
};

var startProcessing = function() {
	console.log('Started conversion.');
	mktemp()
		.then(mp3filetest)
		.then(findTextFiles)
		.then(function() {
			var deferred = Q.defer();
			console.log('Starting render.');
    		console.log('Kicking off '+ global.pcount +' instances of imagemagick.');
    		for (var i=0;i<global.pcount;i++) {
    			doRender(deferred);
    		}
    		return deferred.promise;
		})
		.then(renderMovie)
		.then(function() {
			console.log('here');
		});
};

var mktemp = function() {
	var deferred = Q.defer();
	console.log('Making temp directory.');
	mkdirp(global.tmppath, function (err) {
		if (err) {
			console.error('Cound not create temp path',err);
			process.exit(code=0);
		}
		deferred.resolve();
	});
	return deferred.promise;
};

var mp3filetest = function() {
	var deferred = Q.defer();
	console.log('Testing mp3 file.')
	var mp3mime = mime.lookup(global.mp3file);
	if (mp3mime!=='audio/mpeg') {
		console.log('Error: The specified MP3 file type is not audio/mpeg, most likely an invalid mp3 file.');
		process.exit(code=0);
	}
	console.log('Getting mp3 duration.')
	ffmpeg.ffprobe(global.mp3file, function(err, metadata) {
		if (err) {
			console.log('Your mp3 file is narfed somehow.');
			console.log('ffprobe returned',err);
			process.exit(code=0);
		}
		global.mp3duration = parseFloat(metadata.format.duration);
		deferred.resolve();
	});
	return deferred.promise;
};


var findTextFiles = function() {
	var deferred = Q.defer();
	console.log('Finding text files.');
	find.eachfile(/\.txt$/,(global.txtpath), function(txt) {
		global.zeroPadding = (global.zeroPadding===0) ? txt.match(/\d+/)[0].length : global.zeroPadding;
		global.txtFileList.push(txt);
	}).end(function() {
		global.frameCount = global.txtFileList.length;
		deferred.resolve();
	});
	return deferred.promise;
};

var doRender = function(deferredPromise) {
	// The promise gets passed around in doRender, 
	// so I know when all the processes are finished.
	renderFile().then(function() {
		if (global.txtFileList.length>0) {
			// If there are more text files in the stack, kick-off another instance
			doRender(deferredPromise);
		} else {
			// We wind up here when the last processes finish up.
			// Once global.pcount is 0, we're at the end of the last process
			if (--global.pcount === 0) {
				// Finalize the promise.
				deferredPromise.resolve();
			}
		}
	});
};

var renderFile = function() {
	// This recipe converts a text file to an image and resizes 
	// convert 
	// 		-background black 
	// 		-fill white 
	// 		-font ./fonts/ttf-bitstream-vera-1.10/VeraMono.ttf 
	// 		label:@file.txt
	// 		-resize x720
	// 		-gravity center
	// 		-extent 1280x720
	// 		file.png
	var deferred = Q.defer();
	var txtFile = global.txtFileList.pop();
	// Sometimes we may get here when we're out of text files, exit if so.
	if (typeof txtFile === "undefined") {
		deferred.resolve();
		return deferred.promise;
	}
	console.log('\tPNG-ing Frame: '+ (global.txtFileList.length+1));
	var imgFile = global.tmppath+'/'+txtFile.split('/').pop().replace(/txt$/,'png');
	im.convert([
		'-background', global.font.background,
		'-fill',       global.font.color,
		'-font',       global.font.family,
		'-gravity',    'West',
		'label:@'+txtFile,
		'-resize',     global.font.rendersize.replace(/^\d+/,''),
		'-gravity',    'Center',
		'-extent',     global.font.rendersize,
		imgFile
	], function(err, stdout) {
		if (err) throw err;
		deferred.resolve(stdout);
	});
	return deferred.promise;
};

var renderMovie = function() {
	global.fps = global.frameCount / global.mp3duration;
	// ffmpeg -framerate 24 -i img%010d.png output.mp4
	// var video = new ffmpeg(global.tmppath+'/img.%010d.png')
	// 	.fps(global.fps)
	// 	// add audio file
	// 	// save as mp4

};

var usage = function() {
	console.log('Usage:');
	console.log('	./ascii2movie.node.js --txtpath /path/to/txt/files/ --mp3file /path/to/mp3/file.mp3');
	console.log('');
	console.log('Configuration Options:');
	console.log('	--help');
	console.log('	  (optional)');
	console.log('		Shows this page.');
	console.log('	--title "Name of Your Movie"');
	console.log('	  (optional)');
	console.log('		Title of the movie, defaults to "ASCII Movie".');
	console.log('	--txtpath /path/to/txt/files/');
	console.log('		Name of the path with all of the text files.');
	console.log('	--mp3file /path/to/mp3/file.mp3');
	console.log('		Path to the mp3 file for this video.');
	console.log('   --pcount ##');
	console.log('       Number of simultaneous imagemagick commands to run.');
	console.log('       Default is 100.');
	console.log('       This may hammer your machine, I am on a 2.6 GHz i7')
	console.log('	--fontfamily name_of_font');
	console.log('	  (optional)');
	console.log('		Name of the font to render the images in (you should use a fixed-width font for this).');
	console.log('		Default: Bitstream Vera Sans Mono (VeraMono.ttf)');
	console.log('	--rendersize size_of_video');
	console.log('	  (optional)');
	console.log('		Size of video: 4k, 1080p, 720p, 480p, 360p, 240p');
	console.log('		Default: 720p');
	console.log('	--fontcolor color_of_font');
	console.log('	  (optional)');
	console.log('		Color of font.');
	console.log('       Default: white');
	console.log('	--backgroundcolor background_color');
	console.log('	  (optional)');
	console.log('		Background color.');
	console.log('       Default: black');
	console.log('');
	process.exit(code=0);
};

init();
