var express = require('express');
var fs = require('fs');
var app =  express.createServer();
var url = require('url');
var https = require('https');
var http = require('http');
var mongo = require('mongoskin');
var db = mongo.db('mongodb://hacker:berkeley@alex.mongohq.com:10018/hackberkeley');
var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

var projects;
var events;

var ACCESS_TOKEN = 'AAAD3shybXjYBAJeBIpg6uKS1edUGvHnZBo7Otf65QfBaFNk3FQCAAWb6D2ILICPb0xDeU4ZAM9BrcDGSw6t5wP9ZCCuG6oZD';
// sort comparators for unix timestamps
function asorterTimestamp(a, b) {
  return a - b;
}

function dsorterTimestamp(a, b) {
  return b - a;
}

// sort comparers for date strings
function asorter(a, b) {
  return getTime(a.start_time)-getTime(b.start_time);
}

function dsorter(a, b) {
  return getTime(b.start_time)-getTime(a.start_time);
}

function getTime(a) {
  return new Date(a).getTime();
}

function formatDate(date) {
  var d = date;
  var hh = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var dd = "AM";
  var h = hh;
  if (h >= 12) {
      h = hh-12;
      dd = "PM";
  }
  if (h == 0) {
      h = 12;
  }
  m = m<10?"0"+m:m;
  
  if(m == '00') {
    return h + dd;
  }
  
  s = s<10?"0"+s:s;


  var pattern = new RegExp("0?"+hh+":"+m+":"+s);
  return h+":"+m+dd;
}

function getPhotos(manyalbums) {
  
  for (var j in manyalbums) {
    var inline_function = function(i) {
      var a = manyalbums[i];
      var aid = a['id'];
      var currpic = photographs[aid]['photos'] = [];
      
      var apath = '/' + aid + '/photos?limit=200&access_token='+ACCESS_TOKEN;
      https.get({
        host: 'graph.facebook.com',
        path: apath
      }, function(res) {
          var body = "";
          res.on('data', function(chunk) {
          body += chunk;
        });
        res.on('end', function() {
          try {
            var data = JSON.parse(body);
            var pics = data['data'];
            a['icon'] = pics[0]['picture'];
            for (var j in pics) {
              var photo = {};
              photo['source'] = pics[j]['source'];
              currpic.push(photo);
            }
          } catch (error) {
            console.log(error.message);
          }
        }); 
      });
    }
    inline_function(j);
  }
}

function refreshCache () {
  db.collection('projects').find().sort({'order':1}).toArray(function(err, items){
      projects = items;
  });
  

  https.get({
    host: 'graph.facebook.com',
    path: '/1295520723/albums?access_token='+ACCESS_TOKEN+'&limit=2500&until=13114601440&__paging_token=2035970260967'
  }, function(res) {
      var body = "";
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        try {
          albums = [];
          photographs = {};
          var album;
          var data = JSON.parse(body);
          for (var i in data['data']) {
            album = data['data'][i];
            if (album['name'].indexOf('@') != -1) {
              var currentalbum = {};
              
              currentalbum['name'] = album['name'].substring(4, album['name'].length);
              currentalbum['id'] = album['id'];
              
              currentid = album['id'];
              
              photographs[currentid] = [];
              photographs[currentid]['name'] = currentalbum['name'];
              
              albums.push(currentalbum);
            }
            
          }
          getPhotos(albums);
          
          
        } catch (error) {
          console.log(error.message);
        }
      });
  });

    
  
  https.get({
    host: 'graph.facebook.com',
    path: '/276905079008757/events?access_token=AAAD3shybXjYBAJeBIpg6uKS1edUGvHnZBo7Otf65QfBaFNk3FQCAAWb6D2ILICPb0xDeU4ZAM9BrcDGSw6t5wP9ZCCu%20G6oZD'
  }, function(res) {
    var body = "";
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      try {
        var ts = (new Date()).valueOf();
        events = {'new': [], 'old': []};
        data = JSON.parse(body).data;

        // This is a monkey patch for a fb bug
        addMissingEvent(events);
        
        var event, date;
        for(var i in data) {
          event = data[i];
          // assumes that title contains @ iff it is an H@B event
          if( event.name.indexOf("@") != -1 && typeof(event.name) !== "undefined") {
            // gets a more detailed event object
            https.get({
              host: 'graph.facebook.com',
              path: 'https://graph.facebook.com/' + event.id + '?access_token=AAAD3shybXjYBAJeBIpg6uKS1edUGvHnZBo7Otf65QfBaFNk3FQCAAWb6D2ILICPb0xDeU4ZAM9BrcDGSw6t5wP9ZCCu%20G6oZD'
            }, function(res) {
              body = "",
              res.on('data', function(chunk){
                body += chunk;
              });
              res.on('end', function() {
                if( body == "false") {
                  return;
                }
                try {
                  event = JSON.parse(body);
                } catch(e) {
                  return;
                }
                date = new Date(event.start_time);
                event.date = months[date.getMonth()] + " " + date.getDate();
                event.dateObj = date;
                event.time = formatDate(date);
                if( event.description != undefined ) {
                  event.description = event.description.split('\n').shift();
                }
                event.pic_url = "https://graph.facebook.com/" + event.id + "/picture?type=large"
                if( typeof(event.name) !== "undefined" && event.name.indexOf("Big Hack") >= 0) {
                  event.pic_url = "/images/events/bighack.png";
                }
                if(event.dateObj.valueOf() > ts) {
                  events['new'].push(event);
                } else {
                  events['old'].push(event);
                }

                // sorts the events every time. this may be ineffecient depending on what the sorting algorithm is and could be refactored
                events['new'].sort(asorter);
                events['old'].sort(dsorter);
              });
            });

          }
        }


      } catch (e){console.log(e.message)}
    });
  });

  setTimeout(refreshCache, 60000);
}

// Add the missing H@B office hour event
function addMissingEvent(events) {
  var ts = (new Date()).valueOf();
  var date = new Date('2013-08-27T18:00:00-0700');

  var event = {
    name: "H@B \"Office Hours && Finishathon\"",
    id: "577658228959046",
    dateObj: date,
    date: months[date.getMonth()] + " " + date.getDate(),
    time: formatDate(date),
    description: "If you have any questions about Unix, classes, hacking, or are just new to Computer Science, this is the perfect opportunity to get your questions answered.",
    pic_url: "https://sphotos-b-lax.xx.fbcdn.net/hphotos-prn1/561925_10201250440574416_1488953319_n.jpg"
  };

  if(event.dateObj.valueOf() > ts) {
    events['new'].push(event);
  } else {
    events['old'].push(event);
  }
}

refreshCache();

// Initialize main server
app.use(express.bodyParser());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// For submitting hacks
app.post('/submit', function(req, res){
  url = req.body.demo;
  if (url && url.split(':').length < 2) {
    url = 'http://' + url	
  }
  db.collection('hacks').insert({
    names: req.body.name,
    email: req.body.email,
    contact: req.body.contact,
    project_name: req.body.project_name,
    screenshot: req.body.screenshot,
    demo: url,
    hackathon: 'hack',
    date: new Date()
  }, function(error, docs) {
    res.redirect('/hack/hack')
  });
});

app.get('/', function(req, res){
  res.render('home', {page: 'home', events: events});
});

app.get('/home', function(req, res){
  res.render('home', {page: 'home', events: events});
});

app.get('/sponsors', function(req, res){
  res.render('sponsors', {page: 'sponsors'});
});


app.get('/events', function(req, res){
  res.render('events', {page: 'events', events: events});
});

app.get('/people', function(req, res){
  res.render('people', {page: 'people'});
});

app.get('/media', function(req, res){
  res.render('media', {page: 'media', albums: albums});
});

app.get('/submit', function(req, res){
  res.render('hackjam', {page: 'hack'});
});

app.get('/media/:id', function(req, res){
  var pid = req.params.id;
  var p = photographs[pid];
  if (p != undefined) {
    res.render('photos', {page: 'media', current: p});
  } else {
    res.redirect('/media');
  }

});

app.get('/present', function(req, res) {
  db.collection('hacks').find({ hackathon: 'hack' }).toArray(function(err, presentations) {
    res.render('present', { page: 'media', presentations: presentations.slice(9) });
  });
});

app.get('/hack/:hackathon', function(req, res) {
  db.collection('hacks').find({'hackathon': req.params.hackathon}).toArray(function(err, hacks) {
    if (hacks.length == 0 || err) {
      res.redirect('/');
    } else {
      res.render('hack', {layout: false, hacks: hacks});
    }
  });
});

app.get('/hacks', function(req, res) {
	//Hacks page is now on habitat.hackersatberkeley.com/projects
	/*db.collection('hacks').find().toArray(function(err, hacks) {
		if (hacks.length == 0 || err) {
		  res.redirect('/');
		} else {
		  res.render('hackdb', {page:'hacks', layout: true, hacks: hacks});
		}
	});*/
	res.redirect('http://habitat.hackersatberkeley.com/projects')
});

app.listen(process.env.PORT || 8086);
