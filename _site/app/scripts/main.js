/*global $, Mustache */
(function() {
    'use strict';

    $(document).ready(function(){
        // container 
        //var container = $('#target'),

        // remote url - ssshh... don't tell anyone
        var remoteURL = 'http://servlet.dmi.dk/bv/servlet/bv?stat=',
            imageURL = 'http://servlet.dmi.dk/bv/servlet/bvImage?stat=',
            container = $('#weather-stations'),
            template = $('#ws-template').html(),

            // yahoo api related variables
            yql, jqxhr,

            // remote 
            stationsList = {
                'stations' : [
                    { name: 'Drogden', id: '6183' },
                    { name: 'Kbh lufthavn', id: '6180' },
                    { name: 'Gniben', id: '6169' },
                    { name: 'Jægerspris', id: '56' },
                    { name: 'Nakkehoved Fyr', id: '6168' },
                    { name: 'Kraneled', id: '1350' },
                    { name: 'Vindebæk Kyst', id: '6147' },
                    { name: 'Langø', id: '6138' },
                    { name: 'Thorsminde', id: '6052' }
                ]
            },

            LOADING_DATA_CLASS = 'is-loading';



        function initialize (){


            // create a station
            renderStations( stationsList );

            // iterate over each of the stations
            $.each(stationsList.stations, function(i, stationSettings) {
                //console.log(stationsList.stations[i].name);


                // Take the provided url, and add it to a YQL query
                yql = 'https://query.yahooapis.com/v1/public/yql?'+'q=select%20*%20from%20html%20where%20url%3D%22' + encodeURIComponent(remoteURL) + stationSettings.id + '%22&format=xml&callback=?';

                jqxhr = $.getJSON(yql, function(data){
                                // success
                                if(data.results[0]){

                                    // remove unwanted script-tags etc. from the returned data
                                    var cleanData = filterData(data.results[0]);

                                    // get the values 
                                    var windData = extractData( stationSettings, cleanData );

                                    // inject the station data into the current station
                                    fillData(windData);
                                }
                            })
                            .fail(function() {
                                // what to do when it fails?

                                // Show "no connection message/icon"

                                // Give user option to reload the data

                                console.log('NOT working dummy!');
                            });
            });
        }



        function filterData(data){
            // filter all the nasties out
            // no body tags
            data = data.replace(/<?\/body[^>]*>/g,'');
            // no linebreaks
            data = data.replace(/[\r|\n]+/g,'');
            // no comments
            data = data.replace(/<--[\S\s]*?-->/g,'');
            // no noscript blocks
            data = data.replace(/<noscript[^>]*>[\S\s]*?<\/noscript>/g,'');
            // no script blocks
            data = data.replace(/<script[^>]*>[\S\s]*?<\/script>/g,'');
            // no self closing scripts
            data = data.replace(/<script.*\/>/,'');
            // no images
            data = data.replace(/<img.*\/>/,'');
            // [... add as needed ...]
            return data;
        }

        function extractData(stationData, data) {

            var re1='.*?';  // Non-greedy match on filler
            var re2='((?:(?:[0-1][0-9])|(?:[2][0-3])|(?:[0-9])):(?:[0-5][0-9])(?::[0-5][0-9])?(?:\\s?(?:am|AM|pm|PM))?)'; // HourMinuteSec 1
            var re3='.*?';    // Non-greedy match on filler
            var re4='(\\d+)'; // Integer Number 1
            var re5='.*?';    // Non-greedy match on filler
            var re6='([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';   // Float 1
            var re7='.*?';    // Non-greedy match on filler
            var re8='([+-]?\\d*\\.\\d+)(?![-+0-9\\.])';   // Float 2

            var p = new RegExp(re1+re2+re3+re4+re5+re6+re7+re8,['i']);
            var m = p.exec(data);
            if (m !== null) {

                var $time = m[1].replace(/</,'&lt;'),
                    $angle = m[2].replace(/</,'&lt;'),
                    $speed = m[3].replace(/</,'&lt;'),
                    $temperature = m[4].replace(/</,'&lt;'),
                    $imageURL = imageURL + stationData.id + '&param=wind',

                    // data in JSON format
                    weatherData = {
                        stationId : stationData.id,
                        stationName : stationData.name,
                        windSpeed : $speed,
                        windAngle : $angle,
                        temperature : $temperature,
                        timestamp : $time,
                        stationImageURL : $imageURL
                    };

                return weatherData;
            }
        }


        function renderStations(data) {

            var html, listItem;

            // speed up future uses of mustache (optional)
            Mustache.parse(template);

            // render the mustache template
            html = Mustache.render( template, data );

            // append the renderend template
            container.append(html);


            // show list items with delay
            $('.weather-stations .station').each(function(i){
                var t = $(this);
                setTimeout(function(){
                    t.addClass('animated fadeIn');
                }, (i+1) * 100);
            });
        }


        function setItemLoadingState(item, state) {
            if (state) {
                item.addClass(LOADING_DATA_CLASS);
            }
            else {
                item.removeClass(LOADING_DATA_CLASS);
            }
        }


        function setWindAngle( elm, angle ) {
            $(elm[0]).css('-moz-transform','rotate('+ angle + 'deg)');
            $(elm[0]).css('-webkit-transform','rotate('+ angle + 'deg)');
            $(elm[0]).css('-ms-transform','rotate('+ angle + 'deg)');
            $(elm[0]).css('-o-transform','rotate('+ angle + 'deg)');
        }

        function fillData( data ) {

            // create reference to the list item
            var listItem = $('.weather-stations .station-'+ data.stationId);
            
            // fill in the wind speed
            $(listItem).find('.station-wind-speed b').html(data.windSpeed);
            

            // fill the time
            $(listItem).find('.station-timestamp').html(data.timestamp);

            // fill the temperature
            $(listItem).find('.station-temperature').html(data.temperature);

            // add the image url
            listItem.find('.station-chart img').attr('src', data.stationImageURL);

            // remove the loading icon
            setItemLoadingState(listItem, false);

            // wait for the loader to fade out
            // then set the rotation of the wind arrow
            setTimeout(function() {
                setWindAngle( $(listItem).find('.station-wind-direction'), data.windAngle );
            }, 300);
        }


        // welp... lets get them wind data
        initialize();
    });
}());