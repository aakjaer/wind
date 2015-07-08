/**
 * pull to refresh
 * @type {*}
 */
var PullToRefresh = (function() {

    function Main(container, slidebox, slidebox_icon, handler) {
        var self = this;

        this.breakpoint = 80;

        this.container = container;
        this.slidebox = slidebox;
        this.slidebox_icon = slidebox_icon;
        this.handler = handler;

        this._slidedown_height = 0;
        this._anim = null;
        this._dragged_down = false;

        this.hammertime = Hammer(this.container)
            .on("touch dragdown release", function(ev) {
                self.handleHammer(ev);
            });
    }


    /**
     * Handle HammerJS callback
     * @param ev
     */
    Main.prototype.handleHammer = function(ev) {
        var self = this;

        switch(ev.type) {
            // reset element on start
            case 'touch':
                this.hide();
                break;

            // on release we check how far we dragged
            case 'release':
                if(!this._dragged_down) {
                    return;
                }

                // cancel animation
                cancelAnimationFrame(this._anim);

                // over the breakpoint, trigger the callback
                if(ev.gesture.deltaY >= this.breakpoint) {
                    this.container.removeClass().addClass('pullrefresh-loading');
                    this.slidebox_icon.removeClass().addClass('icon loading');

                    this.setHeight(60);
                    this.handler.call(this);
                }
                // just hide it
                else {
                    this.slidebox.removeClass().addClass('slideup');
                    this.container.removeClass();

                    this.hide();
                }
                break;

            // when we dragdown
            case 'dragdown':
                // if we are not at the top move down
                var scrollY = window.scrollY;
                if(scrollY > 5) {
                    return;
                } else if(scrollY !== 0) {
                    window.scrollTo(0,0);
                }

                this._dragged_down = true;

                // no requestAnimationFrame instance is running, start one
                if(!this._anim) {
                    this.updateHeight();
                }

                // stop browser scrolling
                ev.gesture.preventDefault();

                // update slidedown height
                // it will be updated when requestAnimationFrame is called
                this._slidedown_height = ev.gesture.deltaY * 0.4;
                break;
        }
    };


    /**
     * when we set the height, we just change the container y
     * @param   {Number}    height
     */
    Main.prototype.setHeight = function(height) {
        if(Modernizr.csstransforms3d) {
            this.container.css('transform', 'translate3d(0,'+height+'px,0)');
            this.container.css('oTransform', 'translate3d(0,'+height+'px,0)');
            this.container.css('msTransform', 'translate3d(0,'+height+'px,0)');
            this.container.css('mozTransform', 'translate3d(0,'+height+'px,0)');
            this.container.css('webkitTransform', 'translate3d(0,'+height+'px,0) scale3d(1,1,1)');
        }
        else if(Modernizr.csstransforms) {
            this.container.css('transform', 'translate(0,'+height+'px)');
            this.container.css('oTransform',' translate(0,'+height+'px)');
            this.container.css('msTransform', 'translate(0,'+height+'px)');
            this.container.css('mozTransform', 'translate(0,'+height+'px)');
            this.container.css('webkitTransform', 'translate(0,'+height+'px)');
        }
        else {
            this.container.css('top', height+'px');
        }
    };


    /**
     * hide the pullrefresh message and reset the vars
     */
    Main.prototype.hide = function() {
        this.container.className = '';
        this._slidedown_height = 0;
        this.setHeight(0);
        cancelAnimationFrame(this._anim);
        this._anim = null;
        this._dragged_down = false;
    };


    /**
     * hide the pullrefresh message and reset the vars
     */
    Main.prototype.slideUp = function() {
        var self = this;
        cancelAnimationFrame(this._anim);


        this.slidebox.removeClass().addClass('slideup');
        this.container.removeClass().addClass('pullrefresh-slideup');

        this.setHeight(0);

        setTimeout(function() {
            self.hide();
        }, 500);
    };


    /**
     * update the height of the slidedown message
     */
    Main.prototype.updateHeight = function() {
        var self = this;

        this.setHeight(this._slidedown_height);

        if(this._slidedown_height >= this.breakpoint){
            this.container.removeClass().addClass('pullrefresh-breakpoint');
            this.slidebox_icon.removeClass().addClass('icon arrow arrow-up');
        }
        else {
            this.container.removeClass();
            this.slidebox_icon.removeClass().addClass('icon arrow');
        }

        this._anim = requestAnimationFrame(function() {
            self.updateHeight();
        });
    };

    return Main;
})();



$(document).ready(function() {

    var container_el = $('#container'),
        pullrefresh_el = $('#pullrefresh'),
        pullrefresh_icon_el = $('#pullrefresh-icon')


    var refresh = new PullToRefresh(container_el, pullrefresh_el, pullrefresh_icon_el);

    // update image onrefresh
    refresh.handler = function() {
        var self = this;
        // a small timeout to demo the loading state
        setTimeout(function() {
            self.slideUp();

            console.log(WeatherApp);
            //preload.src = 'http://lorempixel.com/800/600/?'+ (new Date().getTime());
        }, 1500);
    };

    
});
