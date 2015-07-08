/*global $, Mustache, yepnope */
'use strict';

(function() {


    $(document).ready(function(){

        var REMOTE_BASE_URL             = 'http://servlet.dmi.dk/bv/servlet/',
            DATA_URL                    = REMOTE_BASE_URL + 'bv?stat=',
            IMAGE_URL                   = REMOTE_BASE_URL + 'bvImage?stat=',
            IMAGE_URL_PARAMETER         = '&param=wind',
            XDOMAIN_API_URL             = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22' + encodeURIComponent(DATA_URL),
            CONTAINER                   = $('#weather-app .weather-stations'),
            TEMPLATE                    = $('#weather-station-template').html(),
            LIST_HEADER_TEMPLATE        = $('#list-header-template').html();


        function WeatherApp() {
            this.weatherStations = [];
        }

        WeatherApp.prototype = {
            constructor: WeatherApp,

            // loop through the initial stations and add them one by one
            addWeatherStations : function(data, label) {
                var app = this,
                    stationList = data.stations;

                if (typeof stationList !== 'object' || stationList.length < 1) {
                    throw( new TypeError('addWeatherStations argument expected to be an Object (found "' + typeof stationList) + '"), and argument must contain at least one weather station (found "' + stationList.length + '")');
                }

                // insert region header
                if (label.length > 0) {
                    this.renderRegionLabel(label);
                }

                $.each(stationList, function(i, stationData) {

                    var station = new WeatherStation(stationData.id, stationData.name, stationData.mapID);

                    // render the station markup
                    station.renderWeatherStation();

                    // save reference to each weather station
                    app.weatherStations.push(station);

                    // delay the fadein to create the "curtain effect"
                    setTimeout(function(){
                        station.getDOMElement().addClass('animated fadeIn');
                    }, (app.weatherStations.length+1) * 100);

                    station.loadWeatherData();
                });
            },

            renderRegionLabel : function(regionLabel) {

                var html,
                    view = { 'regionName': regionLabel };

                // speed up future uses of mustache
                Mustache.parse(LIST_HEADER_TEMPLATE);

                // render the mustache template
                html = Mustache.render(LIST_HEADER_TEMPLATE, view);

                // append the renderend template
                CONTAINER.append(html);
            },

            refreshAll : function() {
                console.log(this.weatherStations);
            }
        };


        /////////////////////////////////

        // WeatherStation Class

        /////////////////////////////////


        function WeatherStation (id, name, mapID) {
            this.stationId          = id;
            this.stationName        = name;
            this.windSpeed          = 0;
            this.windAngle          = 0;
            this.temperature        = '';
            this.timestamp          = '';
            this.mapTimestamp       = this.getTimeStamp(-2);
            this.chartImageURL      = IMAGE_URL + this.stationId + IMAGE_URL_PARAMETER;
            this.DOMElement         = {};
            this.mapID              = mapID;
        }


        WeatherStation.prototype = {

            constructor: WeatherStation,

            whoAmI : function() {
                console.log('I am: ' + this.stationName);
            },

            loadWeatherData : function() {

                var yql, jqxhr, cleanData,
                    self = this;

                // set loading state
                this.setState('loading');

                // Add the remote url (DMI) to a YQL query
                yql = XDOMAIN_API_URL + this.stationId + '%22&format=xml&callback=?';

                // load the data
                $.jsonp({
                    url: yql,
                    success: function(data) {

                        if (data.results[0]){
                            //console.log(self.stationName);
                            // filter the data and return an object
                            // with the weather data in the right format
                            cleanData = self.filterData(data.results[0]);

                            // save the weather data
                            self.setWeatherData(cleanData);

                            // insert the weather data in the markup
                            self.fillWeatherData();
                       }
                    },
                    error: function(d, msg) {
                        self.setState('error');
                    }
                });
            },

            getDOMElement : function() {
                return this.DOMElement;
            },

            filterData : function(data){

                var re1,re2,re3,re4,re5,re6,p,m,
                    time, angle, speed, imageURL, cleanData;

                // the returned data is a mess - might need to find a better way of doing this
                // filter all the nasties out
                data = data.replace(/<?\/body[^>]*>/g,''); // no body tags
                data = data.replace(/[\r|\n]+/g,''); // no linebreaks
                data = data.replace(/<--[\S\s]*?-->/g,''); // no comments
                data = data.replace(/<noscript[^>]*>[\S\s]*?<\/noscript>/g,''); // no noscript blocks
                data = data.replace(/<script[^>]*>[\S\s]*?<\/script>/g,''); // no script blocks
                data = data.replace(/<script.*\/>/,''); // no self closing scripts
                data = data.replace(/<img.*\/>/,''); // no images


                // this needs improvements!
                re1 = '.*?';  // Non-greedy match on filler
                re2 = '((?:(?:[0-1][0-9])|(?:[2][0-3])|(?:[0-9])):(?:[0-5][0-9])(?::[0-5][0-9])?(?:\\s?(?:am|AM|pm|PM))?)'; // HourMinuteSec 1
                re3 = '.*?';    // Non-greedy match on filler
                re4 = '(\\d+)'; // Integer Number 1
                re5 = '.*?';    // Non-greedy match on filler
                re6 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';   // Float 1

                p = new RegExp(re1+re2+re3+re4+re5+re6,['i']);
                m = p.exec(data);

                if (m != null) {
                    time = m[1].replace(/</,'&lt;');
                    angle = m[2].replace(/</,'&lt;');
                    speed = m[3].replace(/</,'&lt;');
                    //temperature = m[4].replace(/</,'&lt;');

                    // data in JSON format
                    cleanData = {
                        windSpeed: speed,
                        windAngle: angle,
                        //temperature: temperature,
                        timestamp: time
                    };

                    return cleanData;
                }
            },

            setWeatherData : function(data){
                this.windSpeed = data.windSpeed;
                this.windAngle = data.windAngle;
                //this.temperature = data.temperature;
                this.timestamp = data.timestamp;
            },

            addZeroBefore : function(n) {
                return (n < 10 ? '0' : '') + n;
            },

            getTimeStamp : function(offset) {
                var now                 = new Date(),
                    hoursOffset         = now.getHours() - 2, // + (offset),
                    year                = now.getFullYear(),
                    month               = this.addZeroBefore(now.getMonth() + 1),
                    date                = this.addZeroBefore(now.getDate()),
                    hours               = this.addZeroBefore(hoursOffset),
                    timestamp           = year + month + date + hours + '0000';

                 return timestamp;
            },

            fillWeatherData : function() {

                var windArrow           = this.DOMElement.find('.station-wind-direction'),
                    self                = this;


                // fill in the wind speed
                this.DOMElement.find('.station-wind-speed b').html(this.windSpeed);

                // fill the time
                this.DOMElement.find('.station-timestamp').html(this.timestamp);

                // fill the time
                this.DOMElement.find('.station-timestamp').html(this.timestamp);

                // fill the temperature
                //this.DOMElement.find('.station-temperature').html(this.temperature);

                // add the image url
                this.DOMElement.find('.station-chart img').attr('src', this.chartImageURL);

                // wait for the loader to fade out
                // then set the rotation of the wind arrow
                setTimeout(function() {
                    self.setWindDirection( windArrow, self.windAngle );
                }, 300);

                // set the 'finished' state
                this.setState('done');
            },

            setWindDirection : function( elm, angle ) {
                $(elm[0]).css('-moz-transform','rotate('+ angle + 'deg)');
                $(elm[0]).css('-webkit-transform','rotate('+ angle + 'deg)');
                $(elm[0]).css('-ms-transform','rotate('+ angle + 'deg)');
                $(elm[0]).css('-o-transform','rotate('+ angle + 'deg)');
                $(elm[0]).css('transform','rotate('+ angle + 'deg)');
            },

            setState : function(state) {
                this.DOMElement.attr('data-state', state);
            },

            renderWeatherStation : function(){
                var html;

                // speed up future uses of mustache
                Mustache.parse(TEMPLATE);

                // render the mustache template
                html = Mustache.render( TEMPLATE, this );

                // append the renderend template
                CONTAINER.append(html);

                // create reference to the element
                this.DOMElement = CONTAINER.find('[data-station-id="' + this.stationId + '"]');
            }
        };


        var sealand = {
                stations: [
                    { name: 'Drogden', id: '6183', mapID: 'OERESUND' },
                    { name: 'Kbh lufthavn', id: '6180', mapID: 'OERESUND' },
                    { name: 'Lyngbyvej', id: '6184', mapID: 'OERESUND' },
                    { name: 'Gniben', id: '6169', mapID: 'KATTEGAT_SOUTH' },
                    { name: 'Jægerspris', id: '56', mapID: 'SOUND_BELT' },
                    { name: 'Nakkehoved Fyr', id: '6168', mapID: 'KATTEGAT_SOUTH' },
                    { name: 'Vindebæk Kyst', id: '6147', mapID: 'SJAELLAND_SOUTH' },
                    { name: 'Røsnæs Fyr', id: '6159', mapID: 'SOUND_BELT' }
                ]
            },

            lolland_falster = {
                stations: [
                    { name: 'Langø', id: '6138', mapID: 'SJAELLAND_SOUTH' },
                    { name: 'Gedser', id: '6149', mapID: 'SJAELLAND_SOUTH' }
                ]
            },

            fyn = {
                stations: [
                    { name: 'Kraneled', id: '1350', mapID: 'BELT' },
                    { name: 'Assens', id: '6123', mapID: 'BELT' },
                    { name: 'Sydfyns Flyveplads', id: '6124', mapID: 'BELT' },
                    { name: 'Klintholm', id: '871', mapID: 'BELT' }
                ]
            },

            jutland_north = {
                stations: [
                    { name: 'Frederikshavn', id: '6042', mapID: 'SKAGERRAK' },
                    { name: 'Hirtshals', id: '6033', mapID: 'SKAGERRAK' },
                    { name: 'Hanstholm', id: '6021', mapID: 'SKAGERRAK' },
                    { name: 'Skagen Fyr', id: '6041', mapID: 'SKAGERRAK' }
                ]
            },

            jutland_center = {
                stations: [
                    { name: 'Hvide Sande', id: '6058', mapID: 'BELT' },
                    { name: 'Thyborøn', id: '6052', mapID: 'FISKER' },
                    { name: 'Torsminde', id: '6055', mapID: 'FISKER' },
                    { name: 'Sletterhage Fyr', id: '6073', mapID: 'KATTEGAT_SOUTH' }
                ]
            },

            jutland_south = {
                stations: [
                    { name: 'Rømø', id: '6096', mapID: 'TYSKE' },
                    { name: 'Højer', id: '653', mapID: 'TYSKE' },
                    { name: 'Blåvandshug Fyr', id: '6081', mapID: 'TYSKE' },
                    { name: 'Vester Vedsted', id: '6093', mapID: 'TYSKE' }
                ]
            },

            islands = {
                stations: [
                    { name: 'Omø Fyr', id: '6151', mapID: 'SJAELLAND_SOUTH' },
                    { name: 'Anholt', id: '6079', mapID: 'KATTEGAT' }
                ]
            };



        // create the weather app
        // feed it the list of stations - slllurp
        var weatherApp = new WeatherApp();

        weatherApp.addWeatherStations(sealand, 'Sjælland');
        weatherApp.addWeatherStations(lolland_falster, 'Lolland Falster');
        weatherApp.addWeatherStations(fyn, 'Fyn');
        weatherApp.addWeatherStations(jutland_north, 'Nordjylland');
        weatherApp.addWeatherStations(jutland_center, 'Midtjylland');
        weatherApp.addWeatherStations(jutland_south, 'Sønderjylland');
        weatherApp.addWeatherStations(islands, 'Øerne');

    });
}());
