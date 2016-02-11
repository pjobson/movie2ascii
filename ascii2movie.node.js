#!/bin/env node

var fs     = require('fs');
var spawn  = require('child_process').spawn;
var zpad   = require('zpad');
var argv   = require('minimist')(process.argv.slice(2)); // https://github.com/substack/minimist
var mime   = require('mime-types');                      // https://github.com/jshttp/mime-types
var find   = require('find');                            // https://github.com/yuanchuan/find
var mkdirp = require('mkdirp');                          // https://github.com/substack/node-mkdirp
var rimraf = require('rimraf');                          // https://github.com/isaacs/rimraf

var global = {
	path: null,
	info: {},
	txtFiles: [],
	handles: {},
	font: {
		family: 'Courier-New',
		color: 'white',
		background: 'black',
		size: '8'
	}

};

var init = function (){
	global.txtpath         = argv.txtpath           || false;
	global.mp3file         = argv.mp3file           || false;
	global.title           = argv.title             || "ASCII Movie";
	global.path            = './'+ global.title;
	global.font.family     = argv.fontfamily        || global.font.family;
	global.font.color      = argv.fontcolor         || global.font.color;
	global.font.background = argv.backgroundcolor   || global.font.background;
	global.font.size       = argv.fontsize          || global.font.size;
	global.help            = argv.help              || false;

	// Capability Options
	global.info.fontlist  = argv.fontlist   || false;

	if (global.info.fontlist || global.info.formats || global.info.codecs) {
		info();
	} else if (!argv.txtpath || !argv.mp3file || argv.help) {
		usage();
	} else {
		startProcessing();
	}
};

var buildMovie = function() {
	console.log("i'm done.");
};

var startProcessing = function() {
	makeDir(global.path);
	mp3filetest();
	getTxtFiles();
};

var makeDir = function(dir) {
	mkdirp(dir, function (err) {
		if (err) {
			console.log('Could not create directory: '+ dir);
			console.log(err);
			process.exit(code=0);
		}
	});
};

var getTxtFiles = function() {
	find.eachfile(/\.txt/,global.txtpath, function(txt) {
		global.txtFiles.push(txt);
	}).end(function() {
		processTextFile();
	});
};

var framer = function(len) {
	var line = '+';
	for (var i=0;i<len;i++) {
		line+='-';
	}
	line+='+';
	return line;
};

var processTextFile = function() {
	if (global.txtFiles.length===0) {
		return;
	}
	var file = global.txtFiles.shift();
	var filename = file.split('/').pop();
	console.log('Starting: '+ filename);
	// make a directory with this file's name
	fs.readFile(file, {encoding: 'utf-8'}, function(err,data) {
		data = data.replace(/\n+$/,'').split("\n");
		// add an empty row to front and end.
		data.unshift('');
		data.push('');

		data.forEach(function(line,n,arr) {
			if (n===0 || (n+1==arr.length)) {
				var len = arr[2].length;
				line = framer(len);
			} else {
				line = '|'+ line +'|';
			}

			var pngLineName = filename.replace(/\.txt/,'.')+zpad(n,5)+'.png'
			makePNGline(line,pngLineName,filename,arr.length);
		});

	});
};

var makePNGline = function(line,pngfile,handlename,handleCount) {
	handlename = handlename.split('.')[1];
	makeDir(global.path +'/'+ handlename);
	pngfile = global.path +'/'+ handlename +'/'+ pngfile;
	global.handles[handlename] = global.handles[handlename] || handleCount;

	var args  = [
		'-background',global.font.background,
		'-fill',      global.font.color,
		'-font',      global.font.family,
		'-pointsize', global.font.size,
		'label:'+line,
		pngfile
	];

	// Generate image line.
	spawn('convert',args).on('close', function(ev) {
		global.handles[handlename]--;

		// If no more handles, stack all images.
		if (global.handles[handlename]===0) {
			// Start on next file.
			processTextFile();
			var args = [
				global.path+'/'+handlename+'/*.png',
				'-append',
				'-resize',     '1920x1080',
				'-gravity',    'center',
				'-extent',     '1920x1080',
				'-background', global.font.background,
				global.path+'/'+handlename+'.png'
			];
			// Stack that image
			spawn('convert',args).on('close', function(ev) {
				console.log('Finished Frame: '+ handlename.replace(/^0+/,''));
				rimraf(global.path+'/'+handlename+'/', function(err) {
					if (err) console.log(err);
					if (global.txtFiles.length===0) {
						// Done with files.
						buildMovie();
					}
				});
			});
		}
	});
};

var mp3filetest = function() {
	var mp3mime = mime.lookup(global.mp3file);
	if (mp3mime!=='audio/mpeg') {
		console.log('Error: The specified MP3 file type is not audio/mpeg, most likely an invalid mp3 file.');
		process.exit(code=0);
	}
}

var info = function() {
	// fontlist / formats / codecs
	if (global.info.fontlist) {
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
	}
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
	console.log('	--mp3path /path/to/mp3/file.mp3');
	console.log('		Path to the mp3 file for this video.');
	console.log('	--fontfamily name_of_font');
	console.log('	  (optional)');
	console.log('		Name of the font to render the images in (you should use a fixed-width font for this).');
	console.log('		The --fontlist option below lists available fonts.');
	console.log('	--fontsize size_of_font');
	console.log('	  (optional)');
	console.log('		Size of font.');
	console.log('	--fontcolor color_of_font');
	console.log('	  (optional)');
	console.log('		Color of font.');
	console.log('	--backgroundcolor background_color');
	console.log('	  (optional)');
	console.log('		Background color.');
	console.log('');
	console.log('Capability Options:');
	console.log('These do no processing, even if you include other options. They may help to determine issues.');
	console.log('	--fontlist');
	console.log('	  (optional)');
	console.log('		Lists available fonts.');
	process.exit(code=0);
};

init();



