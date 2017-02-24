#!/bin/env node

var os     = require('os');
var fs     = require('fs');
var spawn  = require('child_process').spawn;
var Q      = require('q');                               // https://github.com/kriskowal/q
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
	tmppath: os.tmpdir()+'/ascii2movie',
	font: {
		family: 'CourierNewB',
		color: 'white',
		background: 'black',
		rendersize: '720p'
	}
};

var init = function (){
	global.fontlist        = argv.fontlist   || false;
	global.help            = argv.help       || false;
	global.txtpath         = argv.txtpath    || false;
	global.mp3file         = argv.mp3file    || false;
	global.title           = argv.title      || "ASCII Movie";
	global.font.family     = argv.fontfamily || global.font.family;
	global.font.color      = argv.fontcolor  || global.font.color;
	global.font.background = argv.background || global.font.background;
	global.font.rendersize = argv.rendersize || global.font.rendersize;
	global.font.rendersize = resolutions[global.font.rendersize.trim()];

	if (global.fontlist) {
		info();
	} else if (!global.txtpath || !global.mp3file || argv.help) {
		usage();
	} else {
		startProcessing();
	}
};

var startProcessing = function() {
	console.log('Started conversion.',global);
	mktemp();
	mp3filetest();
	findTextFiles();
};

var mktemp = function() {
	console.log('Making temp directory.');
	mkdirp(global.tmppath, function (err) {
		if (err) console.error(err)
	});
};

var findTextFiles = function() {
	console.log('Finding text files.');
	find.eachfile(/\.txt$/,(global.txtpath), function(txt) {
		global.txtFileList.push(txt);
	}).end(function() {
		console.log('Starting render.');
    	doRender();
    	doRender();
    	doRender();
    	doRender();
    	doRender();
    	doRender();
    	doRender();
    	doRender();
    	doRender();
    	doRender();
	});
};

var doRender = function() {
	console.log('\tFrame: '+global.txtFileList.length);
	renderFile().then(function() {
		if (global.txtFileList.length>0) {
			doRender();
		}
	});
};

var renderFile = function() {
	// This recipe converts a text file to an image resizes 
	// convert -background black \
	//      -fill white \
	//      -font CourierNewB \ -- CourierNewB is Courier New Bold
	//      -pointsize 20 \
	//      -resize 1280x720 \
	//      -gravity center \
	//      -extent 1280x720 \
	//      label:@./img.0000000001.txt \
	//      img.0000000001.png
	var deferred = Q.defer();
	var txtFile = global.txtFileList.pop();
	var imgFile = global.tmppath+'/'+txtFile.split('/').pop().replace(/txt$/,'png');
	im.convert([
		'-background', global.font.background,
		'-fill',       global.font.color,
		'-pointsize',  '20',
		'-resize',     global.font.rendersize,
		'-gravity',    'center',
		'-extent',     global.font.rendersize,
		'label:@'+txtFile,
		imgFile
	], function(err, stdout) {
		if (err) throw err;
		deferred.resolve(stdout);
	});
	return deferred.promise;
};

var mp3filetest = function() {
	console.log('Testing mp3 file.')
	var mp3mime = mime.lookup(global.mp3file);
	if (mp3mime!=='audio/mpeg') {
		console.log('Error: The specified MP3 file type is not audio/mpeg, most likely an invalid mp3 file.');
		process.exit(code=0);
	}
};

var info = function() {
	// fontlist
	console.log('Available fonts:');
	var lst = spawn('convert',['-list','font']);
	var fonts = '';
	lst.stdout.on('data', function (data) {
		fonts += data;
	});
	lst.on('close', function() {
		var lstChr = '';
		var thsChr = false;
		fonts = fonts.replace(/   \w+:.+\n*/g,'').replace(/ +Font: /g,'').replace(/Path:.+\n/g,''); // Clean up stdout
		fonts = fonts.trim().split(/\n/); // Trim & Split
		fonts.forEach(function(name,idx,arr) {
			if (!/[^\x00-\x7F]/.test(name) && !/^\./.test(name)) {
				thsChr = name.substr(0,1).toUpperCase();
				if (lstChr !== thsChr) {
					console.log('\t------ '+ thsChr +' ------');
				}
				console.log("\t"+name);
				lstChr = thsChr;
			}
		});
		process.exit(code=0);
	});
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
	console.log('	--fontfamily name_of_font');
	console.log('	  (optional)');
	console.log('		Name of the font to render the images in (you should use a fixed-width font for this).');
	console.log('		The --fontlist option below lists available fonts.');
	console.log('		Default: Courier New Bold (CourierNewB)');
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
	console.log('Capability Options:');
	console.log('These do no processing, even if you include other options. They may help to determine issues.');
	console.log('	--fontlist');
	console.log('	  (optional)');
	console.log('		Lists available fonts.');
	process.exit(code=0);
};

init();