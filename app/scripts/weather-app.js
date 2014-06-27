/*global $, Mustache, yepnope */
'use strict';

(function() {
    

    $(document).ready(function(){

        var REMOTE_BASE_URL         = 'http://servlet.dmi.dk/bv/servlet/',
            DATA_URL                = REMOTE_BASE_URL + 'bv?stat=',
            IMAGE_URL               = REMOTE_BASE_URL + 'bvImage?stat=',
            IMAGE_URL_PARAMETER     = '&param=wind',
            XDOMAIN_API_URL         = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22' + encodeURIComponent(DATA_URL),
            CONTAINER               = $('#weather-app .weather-stations'),
            TEMPLATE                = $('#ws-template2').html();


        function WeatherApp(data) {
            this.initData = data;
            this.weatherStations = [];
        }

        WeatherApp.prototype = {
            constructor: WeatherApp,

            init : function() {

                var app = this;

                $.each(this.initData, function(i, stationData) {

                    var station = new WeatherStation(stationData.id, stationData.name);
                    station.renderWeatherStation();

                    // save reference to each weather station
                    app.weatherStations[i] = station;
                    
                    // delay the fadein to create the "curtain effect"
                    setTimeout(function(){
                        station.getDOMElement().addClass('animated fadeIn');
                    }, (i+1) * 100);

                    station.loadWeatherData();
                });
            },

            refreshAll : function() {
                console.log(this.weatherStations);
            }
        };


        /////////////////////////////////
        
        // WeatherStation Class
        
        /////////////////////////////////


        function WeatherStation (id, name) {
            this.stationId          = id;
            this.stationName        = name;
            this.windSpeed          = 0;
            this.windAngle          = 0;
            this.temperature        = '';
            this.timestamp          = '';
            this.chartImageURL      = IMAGE_URL + this.stationId + IMAGE_URL_PARAMETER;
            this.DOMElement         = {};
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

                var re1,re2,re3,re4,re5,re6,re7,re8,p,m,
                    time, angle, speed, temperature, imageURL, cleanData;

                // the returned data is a mess - might need to find a better way of doing this
                // filter all the nasties out
                data = data.replace(/<?\/body[^>]*>/g,''); // no body tags
                data = data.replace(/[\r|\n]+/g,''); // no linebreaks
                data = data.replace(/<--[\S\s]*?-->/g,''); // no comments
                data = data.replace(/<noscript[^>]*>[\S\s]*?<\/noscript>/g,''); // no noscript blocks
                data = data.replace(/<script[^>]*>[\S\s]*?<\/script>/g,''); // no script blocks
                data = data.replace(/<script.*\/>/,''); // no self closing scripts
                data = data.replace(/<img.*\/>/,''); // no images

                re1 = '.*?';  // Non-greedy match on filler
                re2 = '((?:(?:[0-1][0-9])|(?:[2][0-3])|(?:[0-9])):(?:[0-5][0-9])(?::[0-5][0-9])?(?:\\s?(?:am|AM|pm|PM))?)'; // HourMinuteSec 1
                re3 = '.*?';    // Non-greedy match on filler
                re4 = '(\\d+)'; // Integer Number 1
                re5 = '.*?';    // Non-greedy match on filler
                re6 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';   // Float 1
                re7 = '.*?';    // Non-greedy match on filler
                re8 = '([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';   // Float 2

                p = new RegExp(re1+re2+re3+re4+re5+re6+re7+re8,['i']);
                m = p.exec(data);

                if (m !== null) {
                    time = m[1].replace(/</,'&lt;');
                    angle = m[2].replace(/</,'&lt;');
                    speed = m[3].replace(/</,'&lt;');
                    temperature = m[4].replace(/</,'&lt;');

                    // data in JSON format
                    cleanData = {
                        windSpeed: speed,
                        windAngle: angle,
                        temperature: temperature,
                        timestamp: time
                    };

                    return cleanData;
                }
            },

            setWeatherData : function(data){
                this.windSpeed = data.windSpeed;
                this.windAngle = data.windAngle;
                this.temperature = data.temperature;
                this.timestamp = data.timestamp;
            },

            fillWeatherData : function() {

                var windArrow   = this.DOMElement.find('.station-wind-direction'),
                    self        = this;

                // fill in the wind speed
                this.DOMElement.find('.station-wind-speed b').html(this.windSpeed);

                // fill the time
                this.DOMElement.find('.station-timestamp').html(this.timestamp);

                // fill the time
                this.DOMElement.find('.station-timestamp').html(this.timestamp);

                // fill the temperature
                this.DOMElement.find('.station-temperature').html(this.temperature);

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

        var stations = [
            { name: 'Drogden', id: '6183' },
            { name: 'Kbh lufthavn', id: '6180' },
            { name: 'Gniben', id: '6169' },
            { name: 'Jægerspris', id: '56' },
            { name: 'Nakkehoved Fyr', id: '6168' },
            { name: 'Kraneled', id: '1350' },
            { name: 'Vindebæk Kyst', id: '6147' },
            { name: 'Langø', id: '6138' },
            { name: 'Thorsminde', id: '6052' }
        ];

        // create the weather app
        // feed it the list of stations - slllurp
        var weatherApp = new WeatherApp(stations);
        weatherApp.init();

    });
}());