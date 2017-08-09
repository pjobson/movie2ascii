var percentTxt = {
	'0': ['   _|   ',' _|  _| ',' _|  _| ',' _|  _| ','   _|   '],
	'1': ['   _| ',' _|_| ','   _| ','   _| ','   _| '],
	'2': ['   _|_|   ',' _|    _| ','     _|   ','   _|     ',' _|_|_|_| '],
	'3': [' _|_|_|   ','       _| ','   _|_|   ','       _| ',' _|_|_|   '],
	'4': [' _|  _|   ',' _|  _|   ',' _|_|_|_| ','     _|   ','     _|   '],
	'5': [' _|_|_|_| ',' _|       ',' _|_|_|   ','       _| ',' _|_|_|   '],
	'6': ['   _|_|_| ',' _|       ',' _|_|_|   ',' _|    _| ','   _|_|   '],
	'7': [' _|_|_|_|_| ','         _| ','       _|   ','     _|     ','   _|       '],
	'8': ['   _|_|   ',' _|    _| ','   _|_|   ',' _|    _| ','   _|_|   '],
	'9': ['   _|_|   ',' _|    _| ','   _|_|_| ','       _| ',' _|_|_|   '],
	'%': [' _|_|    _| ',' _|_|  _|   ','     _|     ','   _|  _|_| ',' _|    _|_| '],
	'/': ['         _| ','       _|   ','     _|     ','   _|       ',' _|         ']
};

var buffering = [
	' ____  _   _ _____ _____ _____ ____  ___ _   _  ____ ',
	'| __ )| | | |  ___|  ___| ____|  _ \\|_ _| \\ | |/ ___|',
	'|  _ \\| | | | |_  | |_  |  _| | |_) || ||  \\| | |  _ ',
	'| |_) | |_| |  _| |  _| | |___|  _ < | || |\\  | |_| |',
	'|____/ \\___/|_|   |_|   |_____|_| \\_\\___|_| \\_|\\____|'
];
var clickPlay = [
	"  ____ _     ___ ____ _  __  ____  _        _ __   __",
	" / ___| |   |_ _/ ___| |/ / |  _ \\| |      / \\\\ \\ / /",
	"| |   | |    | | |   | ' /  | |_) | |     / _ \\\\ V / ",
	"| |___| |___ | | |___| . \\  |  __/| |___ / ___ \\| |  ",
	" \\____|_____|___\\____|_|\\_\\ |_|   |_____/_/   \\_\\_|  "
];

var framePrefetchCount = 1;
var msgChngd = false;
var playClicked = false;

var prefetcher = function() {
	if (playClicked === false) {
		var percent = Math.floor((framePrefetchCount/counter.last)*100);
		bufferingMsgUpdate(percent);

		if (percent >= 15) {
			$('#player').show();
		}

		if (percent===100 && msgChngd===false) {
			msgChngd = true;
			bufferingMsgUpdate('play');
		}
	}

	$.ajax({
		url: 'txt/img.'+ framePadder(++framePrefetchCount) +'.txt',
		success: function(res) {
			// Repeat until it gets a 404.
			prefetcher();
		}
	});
};

var consolelog = function(msg) {
	if (console) {
		console.log(msg);
	}
}


var framePadder = function(f) {
	// Files are as such: img.0000000000.txt
	f = String(f);
	while (f.length<10) {
		f = '0'+f;
	}
	return f;
};

var showFrame = function(frame) {
	// These should be cached by now, so this will load basically instantly.
	consolelog('showing frame:'+ frame);
	$.ajax({
		url: 'txt/img.'+ framePadder(frame) +'.txt',
		success: function(res) {
			$('#movie').html(res);
		}
	});
};

var intervalSpooler = function() {
	showFrame(counter.frame++);
};

var drawPercent = function(num) {
	num = (new String(num+'/100%')).split('');
	var txt = ['','','','',''];
	for (var i=0;i<num.length;i++) {
		for (var j=0;j<txt.length;j++) {
			txt[j] += percentTxt[num[i]][j];
		}
	}
	return txt.join('\n');
};

var bufferingMsgUpdate = function(perc) {
	if (perc === 'play') {
		$('#movie').html(clickPlay.join('\n'));
		$('#player').show();
	} else {
		var txt  = buffering.join('\n') +'\n\n\n'+ drawPercent(perc);
		$('#movie').html(txt);
	}
};

var init = function() {
	$('#player').hide();
	bufferingMsgUpdate(0);
	prefetcher();

	$('#player').bind('play', function(e) {
		playClicked = true;
		window.spool = window.setInterval(intervalSpooler,counter.timeout);
		consolelog('play clicked');
	});
	$('#player').bind('pause', function(e) {
		window.clearInterval(window.spool);
		consolelog('pause clicked');
	});
	$('#player').bind('timeupdate', function(e) {
		// This tries to sync the current frame with the music
		counter.frame = Math.floor(e.currentTarget.currentTime * counter.fps);
		consolelog('Syncing frame to: '+ counter.frame);
	});
};

init();
