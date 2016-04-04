define([
 'dojo/_base/declare',
 'dojo/_base/window',
 'dojo/string',
 'dojo/on',
 'dojo/_base/Color',
 'dojo/dom',
 'dojo/dom-construct',  
 'dojo/store/Memory',
 'dijit/registry', 
 'dijit/form/FilteringSelect',
 'dojox/xml/parser',
 'jimu/BaseWidget', 
 'esri/layers/GraphicsLayer',
 'esri/symbols/SimpleMarkerSymbol',
 'esri/symbols/SimpleLineSymbol',
 'esri/renderers/SimpleRenderer',
 'esri/request',
 'esri/InfoTemplate',
 'esri/geometry/Point',
 'esri/geometry/Extent',
 'esri/geometry/webMercatorUtils',
 'esri/graphic',
 'esri/graphicsUtils',
 'esri/tasks/query',
 'esri/tasks/QueryTask',
 './EFdownloadTribe',
 './configLocal'
 ],
function(
  declare,
  win, 
  string,
  on,
  Color,
  dom,
  domConstruct,
  Memory,
  registry,
  FilteringSelect,
  parser,
  BaseWidget, 
  GraphicsLayer,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  SimpleRenderer,
  esriRequest,
  InfoTemplate,
  Point,
  Extent,
  webMercatorUtils,
  Graphic,
  graphicsUtils,
  Query,
  QueryTask,
  EFdownloadTribe,
  _config  
  ) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // Custom widget code goes here   
    baseClass: 'jimu-widget-SearchEFbyTribe',
    //this property is set by the framework when widget is loaded.
     name: 'SearchEFbyTribe',
   //methods to communication with app container:
    postCreate: function() {
      this.inherited(arguments);    
      this.bboxs = [];
      this.bboxstr = ""; 
    },
   startup: function() {
     this.inherited(arguments);      
   },
    _zippress: function (event) {
        if (event.keyCode == 13) {
            this._drawEFxml();
            return false;
        }
    },
     _clearEF: function () {
        this.countdiv.innerHTML = "";
        if (this.map.getLayer("graphicLayer_" + this.id)) {
            graphiclayer = this.map.getLayer("graphicLayer_" + this.id);
            graphiclayer.clear();
        }
             
        this.map.infoWindow.hide();
        this.dwNode.style.display = "none";
    },
     _downloadEF: function (parameters) {     
        var dwwidget = new EFdownloadTribe({
            map: this.map,
            eftype: "tribe",
            id: 'dwwg' + "_" + this.id,
            parentWidget: this
        }, this.efDownloadNode);
        dwwidget.startup();
    },
     _showloading: function() {
        this.map.disableMapNavigation();
        this.map.hideZoomSlider();
        var x = this.map.width / 2;
        var y = this.map.height / 2;
        if (dom.byId("loadingdiv")) {
                var dummy = dom.byId("loadingdiv");
                dummy.style.position = "absolute";
                dummy.style.left = x + "px";
                dummy.style.top = y + "px";
                dummy.style.display = "block";
                dummy.style.backgroundColor = "yellow";
                dummy.innerHTML = "Loading...Please wait.";
            } else {              
                var dummy = domConstruct.create("div", { id: 'loadingdiv' }, win.body());               
                dummy.style.position = "absolute";
                dummy.style.left = x + "px";
                dummy.style.top = y + "px";
                dummy.style.display = "block";
                dummy.style.backgroundColor = "yellow";
                dummy.style.fontSize = "18px";
                dummy.innerHTML = "Loading...Please wait.";
                dummy.style.zIndex = "1000";               
            }
    },
    _hideloading: function() {
        this.map.enableMapNavigation();
        this.map.showZoomSlider();
        if (dom.byId("loadingdiv")) {
          domConstruct.destroy("loadingdiv");                
        }
    },
  _toggleDownload: function () {
      if(this.dwNodeItems.style.display == "none"){
           this.dwNodeItems.style.display = "block"; 
           this.dwNodeAnchor.className = "toggleOff";
       }else{
          this.dwNodeItems.style.display = "none";
          this.dwNodeAnchor.className = "toggle";
      }    
  }, 
  _setEFDesc: function (graphic) {
       
        var efgeometry = graphic.geometry;
        var gtype = efgeometry.type;
        var coordstr = efgeometry.x + "," + efgeometry.y;
        if (efgeometry.spatialReference.wkid == "102100") {
            var geogeom = webMercatorUtils.webMercatorToGeographic(efgeometry);
            coordstr = geogeom.x + "," + geogeom.y;
        }
       
        var theinfo = "";
        var rpturl = graphic.attributes["REPORT_URL"];
          var regid = graphic.attributes["REG_ID"];
          var facname = graphic.attributes["NAME"];

          theinfo = theinfo + "<b><a href='" + rpturl + regid + "' target='_blank'>" + facname + "</a></b><br />";

          var addr = graphic.attributes["ADDRESS"];
          var city = graphic.attributes["CITY"];
          var state = graphic.attributes["STATE"];
          var zip = graphic.attributes["ZIPCODE"];
          var nearbyreporturl = graphic.attributes["NEARBYREPORTURL"];
          theinfo = theinfo + addr + "<br />";
          theinfo = theinfo + city + ", " + state + " " + zip + "<br />";        
          theinfo = theinfo + "<form action='" + nearbyreporturl + "' method='post' target='_blank'>";
          theinfo = theinfo + "<input name='coords' value='" + coordstr + "' type='hidden'>";
          theinfo = theinfo + "<input name='facname' value='" + facname + "' type='hidden'>";
          theinfo = theinfo + "<input name='type' value='" + gtype + "' type='hidden'>";
          theinfo = theinfo + "<button onclick='this.form.submit(); return false;' class='btn' title='Show analysis'>What's nearby</button>";
          theinfo = theinfo + " in <input name='buff' size='3' maxlength='4' value='1.0' type='text'> mi</form>";
      
          return theinfo;
  },
  _changeRegion: function (a) {
        this._clearEF();
        var regvalue = a.target.value;
        if (regvalue == "--") {
            alert("please select a EPA region!");
            return false;
        }
        this.nolandtribe.style.display = "none";
        this.nolandtribe.innerHTML = "";

        this.eftribalNode.style.display = "block";
        if (registry.byId('listNode')) registry.byId('listNode').destroy();
        var dirty = (new Date()).getTime();
        var wherestr = "REGION = '" + regvalue + "' AND " + dirty + "=" + dirty;
        var query = new Query();
        query.returnGeometry = false;
        query.outFields = ['*'];
        query.where = wherestr;
        query.orderByFields = ["TRIBE_NAME_CLEAN"];
        var eflookupurl = _config.maprestbaseurl + _config.eflookupurl;
        var queryTask = new QueryTask(eflookupurl + "/2");
        var widgetobj = this;
        queryTask.execute(query, function (results) {
            if (results.features.length > 0) {

                var store = new Memory({
                    data: []
                });
                store.put({ name: 'Select a tribe', id: "--" });
                var regnolandstr = "Note: The following federally-recognized tribes currently have no land base and therefore no associated EnviroFacts:<ul style='margin-left: -20px;'>";
                var noland = false;
                for (var i = 0; i < results.features.length; i++) {
                    var tribalid = "" + string.trim(results.features[i].attributes["EPA_ID"]);
                    var tribalname = string.trim(results.features[i].attributes["TRIBE_NAME_CLEAN"]);
                    var landtype = string.trim(results.features[i].attributes["LAND"]);
                    if (landtype == "Y") {

                    var minx = results.features[i].attributes["MIN_X"];
                    var miny = results.features[i].attributes["MIN_Y"];
                    var maxx = results.features[i].attributes["MAX_X"];
                    var maxy = results.features[i].attributes["MAX_Y"];
                    var boxstr = "minx=" + minx + "&miny=" + miny + "&maxx=" + maxx + "&maxy=" + maxy;
                    widgetobj.bboxs[tribalid] = boxstr;
                    store.put({ name: tribalname, id: tribalid });
                  } else {
                    regnolandstr = regnolandstr + "<li>" + tribalname + "</li>";
                    noland = true;
                  }                   
                }

                regnolandstr = regnolandstr + "</ul>";
                if (noland) {
                  widgetobj.nolandtribe.innerHTML = regnolandstr;
                  widgetobj.nolandtribe.style.display = "block";
                }

                var dreg = "--";

                var filteringSelect = new FilteringSelect({
                    id: "listNode",
                    name: "sublist",
                    value: dreg,
                    store: store,
                    style: "width: 200px;overflow:hidden;",
                    searchAttr: 'name'
                }, "listNode");
                filteringSelect.placeAt(widgetobj.eftribalNode);
            }

        }, function (err) {
            alert("error occurred when querying tribal lookup table: " + err);
        });

    },
   _drawEFxml: function () {
      var tribalid = registry.byId("listNode").get("value");
        if (tribalid == "--") {
            alert("Please select a tribe!");
            return false;
        }
        this._showloading();
        var eflinkurl = _config.eflinkurl; 
        var nearbyreporturl = _config.nearbyreporturl;

        this.countdiv.innerHTML = "";
        this.dwNode.style.display = "none";

        var graphiclayer;
        if (this.map.getLayer("graphicLayer_" + this.id)) {
            graphiclayer = this.map.getLayer("graphicLayer_" + this.id);
            graphiclayer.clear();
        } else {
            graphiclayer = new GraphicsLayer({ id: "graphicLayer_" + this.id });
            var efsym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 255, 255]), 1), new Color([128, 128, 64, 0.8]));
            var rd = new SimpleRenderer(efsym);
            rd.label = "Single Facility";
            graphiclayer.setRenderer(rd);
            this.map.addLayer(graphiclayer);
        }

        var widgetobj = this;
        
        var bboxstr = this.bboxs[tribalid];
        this.bboxstr = bboxstr;
        this.baseurl = _config.efxmloasbaseurl + "pQuery=&pPgm=MULTI&pChem=&pCode=&pMedia=(tims)(" + tribalid + ")(miles_to)(0)";
        var inputurl = this.baseurl + "&" + bboxstr;
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

        var newext = new Extent({ "xmin": parseFloat(tminx), "ymin": parseFloat(tminy), "xmax": parseFloat(tmaxx), "ymax": parseFloat(tmaxy), "spatialReference": { "wkid": 4326} });
        this.map.setExtent(newext,true);
        
        widgetobj.countdiv.innerHTML = "Loading...please wait.";
        var efRequest = esriRequest({
            url: inputurl,
            handleAs: "text"
        });
        efRequest.then(
          function (xml) {            
              var domObj = parser.parse(xml);             
              var efobj = domObj.getElementsByTagName("Fac");
              var efcount = efobj.length;
              
              widgetobj.countdiv.innerHTML = "# of facilities found: " + efcount;
              if (efcount > 0) {
                  var singletemplate = new InfoTemplate();
                  singletemplate.setTitle("Site Reporting to EPA:");
                  singletemplate.setContent(widgetobj._setEFDesc);
                  for (var i = 0; i < efcount; i++) {
                      var tnodes = efobj[i].childNodes;
                      var regid, lat, lon, addr, facname, city, state, zip;
                      for (var k = 0; k < tnodes.length; k++) {

                          var tnodes = efobj[i].childNodes;
                          var regid, lat, lon, addr, facname, city, state, zip;                      
                              
                              regid = efobj[i].attributes["id"].value;
                              city = efobj[i].attributes["city"].value;
                              state = efobj[i].attributes["state"].value;
                              zip = efobj[i].attributes["zip"].value;
                              lat = efobj[i].attributes["lat"].value;
                              lon = efobj[i].attributes["lng"].value;
                          
                          for (var k = 0; k < tnodes.length; k++) {                                                          
                                  if (tnodes[k].nodeName == "name") facname = tnodes[k].textContent;
                                  if (tnodes[k].nodeName == "addr") addr = tnodes[k].textContent;                              
                          }

                      }                     

                      var pnt = new Point({ "x": lon, "y": lat, " spatialReference": { " wkid": 4326} });
                      var mgeom = webMercatorUtils.geographicToWebMercator(pnt);
                      var g = new Graphic(mgeom);
                      g.attributes = { "REPORT_URL": eflinkurl, "REG_ID": regid, "NAME": facname, "ADDRESS": addr, "CITY": city, "STATE": state, "ZIPCODE": zip,"NEARBYREPORTURL": nearbyreporturl };
                      g.setInfoTemplate(singletemplate);
                      graphiclayer.add(g);
                  }

                  widgetobj.dwNode.style.display = "block";                 
                  if (registry.byId("dwwg" + "_" + widgetobj.id)) {                      
                      registry.byId("dwwg" + "_" + widgetobj.id).loadNode.innerHTML = "";
                  } else {
                      widgetobj._downloadEF();
                  }
                  var extent = graphicsUtils.graphicsExtent(graphiclayer.graphics);
                  if (extent == null) {

                  } else {
                      widgetobj.map.setExtent(extent, true);
                  }
              }
              widgetobj._hideloading();
          }, function (error) {
            widgetobj.countdiv.innerHTML = "Error: " + error.message;             
             widgetobj._hideloading();
          });
    }     
  });
});