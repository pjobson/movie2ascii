#!/usr/local/bin/node

var fs      = require('fs');                              // http://nodejs.org/api/fs.html
var find    = require('find');                            // https://github.com/yuanchuan/find
var art     = require('ascii-art');                       // https://github.com/khrome/ascii-art
var jp2a    = require("jp2a");                            // https://github.com/lsvx/node-jp2a
var ffmpeg  = require("fluent-ffmpeg");                   // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
var argv    = require('minimist')(process.argv.slice(2)); // https://github.com/substack/minimist
var mkdirp  = require('mkdirp');                          // https://github.com/substack/node-mkdirp

var global = {
	fps: false,
	path: {
		top: null,
		mp3: 'mp3/',
		img: 'img/',
		txt: 'txt/'
	},
	has: {
		video: false,
		audio: false
	},
	isDone: {
		audio: false,
		video: false
	},
	waitChrs: ['\u2058','\u2059'],
	watermark: false,
	help: false,
	font: 'standard',
	info: {
		fontlist: false,
		formats:  false,
		codecs:   false
	},
	doneWriting: false
};

var init = function() {
	global.movie     = argv.movie     || false;
	global.watermark = argv.watermark || false;
	global.font      = argv.font      || global.font;
	global.help      = argv.help      || false;

	// Top Paths
	global.path.top  = (!argv.movie) ? false : (argv.path || argv.movie.replace(/\.\w+$/,'')) +'/';
	global.path.top  = (!argv.movie) ? false : global.path.top.replace(/\/+$/,'/'); // removes duplicate trailing slashes

	// Capability Options
	global.info.fontlist  = argv.fontlist   || false;
	global.info.formats   = argv.formats    || false;
	global.info.codecs    = argv.codecs || false;

	if (global.info.fontlist || global.info.formats || global.info.codecs) {
		info();
	} else if (!argv.movie || argv.help) {
		usage();
	} else {
		startProcessing();
	}
};

var startProcessing = function() {
	// I can do all of this at the same time.
	// Make some paths
	makePaths();

	// Probe the video.
	probeVideo();

	// Render the FIGlet
	if (global.watermark) {
		renderFIGlet();
	}
}


var makePaths = function() {
	mkdirp(global.path.top + global.path.mp3);
	mkdirp(global.path.top + global.path.img);
	mkdirp(global.path.top + global.path.txt);
}



var probeVideo = function() {
	// Probe video.
	ffmpeg.ffprobe(global.movie, function(err, metadata) {
		metadata.streams.forEach(function(stream) {
			global.has[stream.codec_type] = true;
			if (stream.codec_type === 'video') {
				global.fps = stream.r_frame_rate.split('/');
				global.fps = parseFloat(global.fps[0]) / parseFloat(global.fps[1]);
				global.fps = Math.floor(global.fps/10)*10; // round down to the nearest 10's place
			}
		});

		// If no video data, stop here.
		if (global.has.video === false) {
			console.log('Error: Movie file does not have any video data associated with it.');
			process.exit(code=0);
		}

		// If couldn't detect FPS, just set to 20.
		global.fps = global.fps || 20;

		// Process video.
		processVideo();
	});
};

var processVideo = function() {
	// ffmpeg processing
	// this takes the longest
	// ffmpeg -i ../Too\ Many\ Cooks\ -\ Adult\ Swim.mp4 -r 20 jpg/img.%10d.jpg
	// ffmpeg -i “whatever.format” -vn -ac 2 -ar 44100 -ab 320k -f mp3 output.mp3

	if (global.has.audio) {
		// Extract the audio here
		var audio = new ffmpeg(global.movie)
			.noVideo()
			.audioChannels(2)
			.audioBitrate('128k')
			.audioCodec('libmp3lame')
			.fps(global.fps)
			.outputOptions(['-f mp3'])
			.output(global.path.top + global.path.mp3 + 'audio.mp3')
			.on('start', function() {
				console.log('Ripping MP3.')
			})
			.on('end', function() {
				console.log('\nFinished ripping MP3.');
				global.isDone.audio = true;
				testExtractDone();
			})
			.on('progress', function(progress) {
				process.stdout.write(global.waitChrs[Math.floor(Math.random() * 2)]);
			})
			.run();
	} else {
		global.isDone.audio = true;
	}

	// Extract JPGs here
	var video = new ffmpeg(global.movie)
		.noAudio()
		.fps(global.fps)
		.output(global.path.top + global.path.img + 'img.%10d.jpg')
		.on('start', function() {
			console.log('Ripping JPGs.')
		})
		.on('end', function() {
			console.log('\nFinished ripping JPGs.');
			global.isDone.video = true;
			testExtractDone();
		})
		.on('progress', function(progress) {
			process.stdout.write(global.waitChrs[Math.floor(Math.random() * 2)]);
		})
		.run();
};

var testExtractDone = function() {
	if (global.isDone.audio === false || global.isDone.video === false) {
		return;
	}
	renderJP2A();
};

var renderFIGlet = function() {
	// render watermark
	console.log('Rendering watermark.');
	art.Figlet.fontPath = 'FIGlet_fonts/';
	art.font(global.watermark, global.font, function(rendered){
		global.watermark = rendered.split(/\n/);
		global.watermark.pop();
	});
};

var renderJP2A = function(art) {
	console.log('ASCII-ifing images.');
	// find images in img folder
	find.eachfile(/\.jpg$/,(global.path.top+global.path.img), function(jpg) {
		jp2a( [ jpg, "--width=180", "--border" ],  function( output ){
			watermarker(output,jpg);
		});
	}).end(function() {
		// hold off for a bit to make sure we're actually done writing.
		global.interval = setInterval(function() {
			if (global.doneWriting) {
				clearInterval(global.interval);
				console.log('');
				// gen HTML files
			}
		},1000);
	});
};

var watermarker = function(frame,jpg) {
	if (global.watermark !== false) {
		frame = frame.split(/\n/);
		frame.pop();
		for (var i=0;i<global.watermark.length;i++) {
			// Split Frame into array
			var currFrame = frame[(frame.length - global.watermark.length + i)].split('');
			// Split ascii global.watermark into array
			var currArt   = global.watermark[i].split('');
			// Get a start position, offset 5 characters from right border
			var startPOS  = currFrame.length - 5 - currArt.length + 1;

			for (var j=0;j<currArt.length;j++) {
				// Replace characters which aren't spaces
				if (currArt[j] !== ' ') {
					currFrame[startPOS+j] = currArt[j];
				}
			}

			// Join the currFrame back together and stuff it back into the frame
			frame[(frame.length - global.watermark.length + i)] = currFrame.join('');
		}
		// join entire frame back together
		frame = frame.join('\n');
	}
	// write the file
	writeFile(frame,jpg);
};

var writeFile = function(frame,jpg) {
	global.doneWriting = false;
	// rename the jpg to text and put it in proper place
	var fname = jpg.replace(/.+(img\.\d+)\.jpg/,global.path.top+global.path.txt+'$1.txt');
	fs.writeFile(fname,frame, function() {
		process.stdout.write(global.waitChrs[Math.floor(Math.random() * 2)]);
		global.doneWriting = true;
	});
};


var usage = function() {
	console.log('Usage: ');
	console.log('	./movie2ascii.node.js --movie name_of_movie.ext');
	console.log('');
	console.log('Options: ');
	console.log('	--help');
	console.log('	  (optional)');
	console.log('		Shows this page.');
	console.log('	--movie whatever_movie.ext');
	console.log('		Name of your movie file.');
	console.log('		To see what your install of ffmpeg supports use: ffmpeg -formats');
	console.log('	--path /path/to/output/to/');
	console.log('	  (optional)');
	console.log('		Name of path to build to, creates path based on movie file name by default.');
	console.log('	--watermark "Some Text"');
	console.log('	  (optional)');
	console.log('		Watermarks the bottom of the image.');
	console.log('	--font name_of_font');
	console.log('	  (optional)');
	console.log('		Watermarks the bottom of the image.');
	console.log('');
	console.log('Capability Options: ');
	console.log('These do no video processing, even if you include other options. They may help to determine issues.');
	console.log('	--fontlist');
	console.log('	  (optional)');
	console.log('		Lists available fonts.');
	console.log('	--formats');
	console.log('	  (optional)');
	console.log('		Lists available video formats.');
	console.log('	--codecs');
	console.log('	  (optional)');
	console.log('		Lists available video codecs.');
	process.exit(code=0);
};

var info = function() {
	// fontlist / formats / codecs
	console.log(global.info);
	if (global.info.fontlist) {
		console.log('Available fonts:');
		find.file(/\.flf$/,'FIGlet_fonts/', function(fonts) {
			fonts.sort().map(function(font) {
				console.log('\t'+font.replace(/FIGlet_fonts\/(.+?)\.flf/,'$1'));
			});
			console.log('');
			console.log('Examples are available here: http://www.figlet.org/fontdb.cgi');
			console.log('Some of these will probably not work very well.');
			console.log('');
		});
	}

	if (global.info.formats) {
		ffmpeg.getAvailableFormats(function(err, formats) {
			console.log('Available read formats:');
			for (var k in formats) {
				if(formats[k].canDemux) {
					console.log('\t'+k);
				}
			}
			console.log('');
		});
	}

	if (global.info.codecs) {
		ffmpeg.getAvailableCodecs(function(err, codecs) {
			console.log('Available read codecs:');
			for (var k in codecs) {
				if(codecs[k].canDecode) {
					console.log('\t'+k);
				}
			}
			console.log('');
		});
	}

};

// back to the front!
init();
