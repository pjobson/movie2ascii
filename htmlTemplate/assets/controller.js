var framePrefetchCount = 1;
var prefetcher = function() {
	$.ajax({
		url: 'txt/img.'+ framePadder(++framePrefetchCount) +'.txt',
		success: function(res) {
			// Repeat until it gets a 404.
			prefetcher();
		}
	});
};

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
	console.log('frame:'+ frame);
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

var player = new MediaElementPlayer('#player',{
	plugins: ['flash','silverlight'],
	flashName: 'flashmediaelement.swf',
	silverlightName: 'silverlightmediaelement.xap',
	success: function (mediaElement, domObject) {
		prefetcher();
		$('#player').bind('play', function(e) {
			window.spool = window.setInterval(intervalSpooler,counter.timeout);
		});
		$('#player').bind('pause', function(e) {
			window.clearInterval(window.spool);
		});
		$('#player').bind('timeupdate', function(e) {
			// This tries to sync the current frame with the music
			counter.frame = Math.floor(e.currentTarget.currentTime * counter.fps);
		});
	}
});


