define([
  "dojo/_base/declare",
  "dojo/dom-construct",
  "dijit/_Widget",
  "dijit/_Templated",
  "dojo/text!./templates/EFdownload.html",
  "esri/tasks/Geoprocessor",
  "./configLocal"
], function(
 declare,
 domConstruct,
 _Widget,
 _Templated,
 template,
 Geoprocessor,
 _config
 ){
    return declare("EFdownloadTribe", [_Widget, _Templated], {
    templateString: template,
    widgetsInTemplate: false,
    constructor: function (options, srcRefNode) {

        options = options || {};
        if (!options.map) throw new Error("no map defined in params for EF download widget.");
        //        if (!options.featureset) throw new Error("no featureset defined in the download widget.");
        //        this.featureset = options.featureset;
        this.map = options.map;
        this.eftype = options.eftype;
        this.parentWidget = options.parentWidget;
        // mixin constructor options 
        declare.safeMixin(this, options);

       var maprestbaseurl = _config.maprestbaseurl; 
       this.gpxmlclusterurl = maprestbaseurl + _config.gpxmlclusterurl;        
       this.gpxml2shpcsvurl = maprestbaseurl + _config.gpxml2shpcsvurl;

        var gpshpurl = this.gpxml2shpcsvurl;       
        this.gp = new Geoprocessor(gpshpurl);
    },

    startup: function () {
    },
    postCreate: function () {
       this.imgSHP.src = this.parentWidget.folderUrl + "images/shpBtn.png";
       this.imgCSV.src = this.parentWidget.folderUrl + "images/csvBtn.png";
       this.imgKML.src = this.parentWidget.folderUrl + "images/geBtn.png";       
    },

    _saveShapefile: function () {       
        this.loadNode.innerHTML = "Loading... please wait";        
        var params;
        
        var efbaseurl = this.parentWidget.baseurl;
            var bboxstr = this.parentWidget.bboxstr;
            var boxarray = bboxstr.split("&");
            var tminx, tminy, tmaxx, tmaxy;
            for (var i = 0; i < boxarray.length; i++) {
                var xystr = boxarray[i];
                var p = xystr.split("=")[0];
                var v = xystr.split("=")[1];
                if (p == "minx") tminx = v;
                if (p == "miny") tminy = v;
                if (p == "maxx") tmaxx = v;
                if (p == "maxy") tmaxy = v;
            }
            params = { "xmlurl": efbaseurl, "min_longitude": tminx, "min_latitude": tminy, "max_longitude": tmaxx, "max_latitude": tmaxy, "output_format": "shapefile" };

        
        
        if (this.gprequest) this.gprequest.cancel();
        var wobj = this;
        this.gprequest = this.gp.execute(params, function (results) {
            wobj.loadNode.innerHTML = "";
            var shpurl = results[0].value;
            window.open(shpurl);
        }, function (err) {
            wobj.loadNode.innerHTML = "Generate shapefile failed. Error: " + err;
            console.log("something failed: ", err);
        });
    },
    _saveCSVfile: function () {
        this.loadNode.innerHTML = "Loading... please wait";
        if (this.gprequest) this.gprequest.cancel();
        

        var params;
        var efbaseurl = this.parentWidget.baseurl;
            var bboxstr = this.parentWidget.bboxstr;
            var boxarray = bboxstr.split("&");
            var tminx, tminy, tmaxx, tmaxy;
            for (var i = 0; i < boxarray.length; i++) {
                var xystr = boxarray[i];
                var p = xystr.split("=")[0];
                var v = xystr.split("=")[1];
                if (p == "minx") tminx = v;
                if (p == "miny") tminy = v;
                if (p == "maxx") tmaxx = v;
                if (p == "maxy") tmaxy = v;
            }


            params = { "xmlurl": efbaseurl, "min_longitude": tminx, "min_latitude": tminy, "max_longitude": tmaxx, "max_latitude": tmaxy, "output_format": "csvfile" };

       
        var wobj = this;
        this.gprequest = this.gp.execute(params, function (results) {
            wobj.loadNode.innerHTML = "";
            var csvurl = results[0].value;
            window.open(csvurl);
        }, function (err) {
            wobj.loadNode.innerHTML = "Generate CSV file failed. Error: " + err;
            console.log("CSV gp failed: ", err);
        });
    },   
    _saveKML: function () {
        var gpfeaturl = this.gpxmlclusterurl;
        
        var url = "";
        var efbaseurl = this.parentWidget.baseurl;
            var bboxstr = this.parentWidget.bboxstr;
            var boxarray = bboxstr.split("&");
            var tminx, tminy, tmaxx, tmaxy;
            for (var i = 0; i < boxarray.length; i++) {
                var xystr = boxarray[i];
                var p = xystr.split("=")[0];
                var v = xystr.split("=")[1];
                if (p == "minx") tminx = v;
                if (p == "miny") tminy = v;
                if (p == "maxx") tmaxx = v;
                if (p == "maxy") tmaxy = v;
            }
            url = gpfeaturl + "/execute?xmlurl=" + encodeURIComponent(efbaseurl) + "&min_longitude=" + tminx + "&min_latitude=" + tminy + "&max_longitude=" + tmaxx + "&max_latitude=" + tmaxy + "&showcluster=false&f=kmz";
       
        window.open(url);
    },
    destroy: function () {
        domConstruct.empty(this.domNode);
    }
 });

});





