define(['dojo/_base/declare',
 'jimu/BaseWidget',
 'dijit/form/FilteringSelect',
 'esri/request',
 './EFdownload',
 './configLocal'
 ],
function(declare, BaseWidget,FilteringSelect,esriRequest,EFdownload,_config) {
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
	  
	  var regionnum = "";
	  var tribeid = "";
	  
	  var widgetobj = this;
	  
	  if (this.appConfig.region) regionnum = this.appConfig.region;    
	  if (this.appConfig.tribe) tribeid = this.appConfig.tribe;
     	  
	  if (tribeid.length > 0 && regionnum.length > 0) {
	  	 
	  widgetobj.regNode.value = regionnum;
	  widgetobj._changeRegion(regionnum);		
	  }	 

    },

   startup: function() {
     this.inherited(arguments);
     console.log('startup');
   },

destroy: function () {

        if (this.map.getLayer("graphicLayer")) {
            graphiclayer = this.map.getLayer("graphicLayer");
            this.map.removeLayer(graphiclayer);
        }
        dojo.empty(this.domNode);
        this.map.infoWindow.hide();

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
	_changeRegionEvent: function (a) {
		//function wired to list change, pass event value to non-event function
		var regvalue = a.target.value;
		this._changeRegion(regvalue);
	},
     _changeRegion: function (a) {
        this._clearEF();
        var regvalue = a;
        if (regvalue == "--") {
            alert("Please select an EPA region!");
            return false;
        }
        this.nolandtribe.style.display = "none";
        this.nolandtribe.innerHTML = "";

        this.eftribalNode.style.display = "block";
        if (dijit.byId('listNode')) dijit.byId('listNode').destroy();
        var dirty = (new Date()).getTime();
        var wherestr = "REGION = '" + regvalue + "' AND " + dirty + "=" + dirty;
        var query = new esri.tasks.Query();
        query.returnGeometry = false;
        query.outFields = ['*'];
        query.where = wherestr;
        query.orderByFields = ["TRIBE_NAME_CLEAN"];
        var eflookupurl = _config.maprestbaseurl + _config.eflookupurl;
        var queryTask = new esri.tasks.QueryTask(eflookupurl + "/2");
        var widgetobj = this;
        queryTask.execute(query, function (results) {
            if (results.features.length > 0) {

                var store = new dojo.store.Memory({
                    data: []
                });
                store.put({ name: 'Select a tribe', id: "--" });
                var regnolandstr = "Note: The following federally-recognized tribes currently have no land base and therefore no associated EnviroFacts:<ul style='margin-left: -20px;'>";
                var noland = false;
                for (var i = 0; i < results.features.length; i++) {
                    var tribalid = "" + dojo.string.trim(results.features[i].attributes["EPA_ID"]);
                    var tribalname = dojo.string.trim(results.features[i].attributes["TRIBE_NAME_CLEAN"]);
                    var landtype = dojo.string.trim(results.features[i].attributes["LAND"]);
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
                    //console.log(tribalid + ": " + tribalname);
                }

                regnolandstr = regnolandstr + "</ul>";
                if (noland) {
                  widgetobj.nolandtribe.innerHTML = regnolandstr;
                  widgetobj.nolandtribe.style.display = "block";
                }


                var dreg = "--";
				if (widgetobj.appConfig.tribe){
					dreg = widgetobj.appConfig.tribe;				
					
				}

                var filteringSelect = new dijit.form.FilteringSelect({
                    id: "listNode",
                    name: "sublist",
                    value: dreg,
                    store: store,
                    style: "width: 200px;overflow:hidden;",
                    searchAttr: 'name'
                }, "listNode");
                filteringSelect.placeAt(widgetobj.eftribalNode);
				
				//fire query if external init, clear init params after
				if (widgetobj.appConfig.region && widgetobj.appConfig.tribe) 
				{
					widgetobj._drawEFxml();		
					widgetobj.appConfig.region = null;
					widgetobj.appConfig.tribe = null;				
				}
	 
				
				
            }

        }, function (err) {
            alert("error occurred when querying tribal lookup table: " + err);
        });

    },
    _drawEFxml: function () {
      var tribalid = dijit.byId("listNode").get("value");
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
            graphiclayer = new esri.layers.GraphicsLayer({ id: "graphicLayer_" + this.id });
            var efsym = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE, 10, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 255, 255]), 1), new dojo.Color([128, 128, 64, 0.8]));
            var rd = new esri.renderer.SimpleRenderer(efsym);
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

        var newext = new esri.geometry.Extent({ "xmin": parseFloat(tminx), "ymin": parseFloat(tminy), "xmax": parseFloat(tmaxx), "ymax": parseFloat(tmaxy), "spatialReference": { "wkid": 4326} });
        this.map.setExtent(newext,true);
        
        widgetobj.countdiv.innerHTML = "Loading...please wait.";
        var efRequest = esri.request({
            url: inputurl,
            handleAs: "text"
        });
        efRequest.then(
          function (response) {
              var isIE = false;
              var xml = response;
              var dom = null;
              if (window.DOMParser) {
                  try {
                      dom = (new DOMParser()).parseFromString(xml, "text/xml");
                  }
                  catch (e) { dom = null; }
              }
              else if (window.ActiveXObject) {
                  try {
                      isIE = true;
                      dom = new ActiveXObject('Microsoft.XMLDOM');
                      dom.async = false;
                      if (!dom.loadXML(xml)) // parse error ..

                          window.alert(dom.parseError.reason + dom.parseError.srcText);
                  }
                  catch (e) { dom = null; }
              }
              else {
                  alert("cannot parse xml string!");
                  return false;
              }
              var efobj = dom.getElementsByTagName("Fac");
              var efcount = efobj.length;
              
              widgetobj.countdiv.innerHTML = "# of facilities found: " + efcount;
              if (efcount > 0) {
                  var singletemplate = new esri.InfoTemplate();
                  singletemplate.setTitle("Site Reporting to EPA:");
                  singletemplate.setContent(widgetobj._setEFDesc);
                  for (var i = 0; i < efcount; i++) {
                      var tnodes = efobj[i].childNodes;
                      var regid, lat, lon, addr, facname, city, state, zip;
                      for (var k = 0; k < tnodes.length; k++) {

                          var tnodes = efobj[i].childNodes;
                          var regid, lat, lon, addr, facname, city, state, zip;
                          if (isIE) {
                              //regid = efobj[i].getAttribute("id");
                              regid = efobj[i].getAttribute("id");
                              city = efobj[i].getAttribute("city");
                              state = efobj[i].getAttribute("state");
                              zip = efobj[i].getAttribute("zip");
                              lat = efobj[i].getAttribute("lat");
                              lon = efobj[i].getAttribute("lng");
                          } else {
                              //regid = efobj[i].attributes["id"].value;
                              regid = efobj[i].attributes["id"].value;
                              city = efobj[i].attributes["city"].value;
                              state = efobj[i].attributes["state"].value;
                              zip = efobj[i].attributes["zip"].value;
                              lat = efobj[i].attributes["lat"].value;
                              lon = efobj[i].attributes["lng"].value;
                          }
                          for (var k = 0; k < tnodes.length; k++) {
                              //alert(tnodes[k].nodeName + ": " + tnodes[k].Text + ": " + tnodes[k].nodeValue + ": " + tnodes[k].text + ": " + tnodes[k].textContent + ": " + tnodes[k].innerText + ": " + tnodes[k].innerXML);
                              if (isIE) {
                                  if (tnodes[k].nodeName == "name") facname = tnodes[k].text;
                                  if (tnodes[k].nodeName == "addr") addr = tnodes[k].text;
                              } else {
                                  if (tnodes[k].nodeName == "name") facname = tnodes[k].textContent;
                                  if (tnodes[k].nodeName == "addr") addr = tnodes[k].textContent;
                              }
                          }

                      }
                      //alert(lat + ", " + lon);

                      var pnt = new esri.geometry.Point({ "x": lon, "y": lat, " spatialReference": { " wkid": 4326} });
                      var mgeom = esri.geometry.geographicToWebMercator(pnt);
                      var g = new esri.Graphic(mgeom);
                      g.attributes = { "REPORT_URL": eflinkurl, "REG_ID": regid, "NAME": facname, "ADDRESS": addr, "CITY": city, "STATE": state, "ZIPCODE": zip,"NEARBYREPORTURL": nearbyreporturl };

                      g.setInfoTemplate(singletemplate);
                      graphiclayer.add(g);
                  }

                  widgetobj.dwNode.style.display = "block";                 
                  if (dijit.registry.byId("dwwg" + "_" + widgetobj.id)) {
                      //dojo.style(dijit.byId("dwwg").domNode, "display", "block");
                      dijit.byId("dwwg" + "_" + widgetobj.id).loadNode.innerHTML = "";
                  } else {
                      widgetobj._downloadEF();
                  }
                  var extent = esri.graphicsExtent(graphiclayer.graphics);
                  if (extent == null) {

                  } else {
                      widgetobj.map.setExtent(extent, true);
                  }
              }
              widgetobj._hideloading();
          }, function (error) {
            widgetobj.countdiv.innerHTML = "Error: " + error.message;
              //console.log("Error: " + error.message);
              //alert("Error: " + error.message);
             widgetobj._hideloading();
          });
    },

    _drawEFxml_new: function () {
      var tribalid = dijit.byId("listNode").get("value");
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
            graphiclayer = new esri.layers.GraphicsLayer({ id: "graphicLayer_" + this.id });
            var efsym = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE, 10, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 255, 255]), 1), new dojo.Color([128, 128, 64, 0.8]));
            var rd = new esri.renderer.SimpleRenderer(efsym);
            rd.label = "Single Facility";
            graphiclayer.setRenderer(rd);
            this.map.addLayer(graphiclayer);
        }


        var widgetobj = this;


        
        var bboxstr = this.bboxs[tribalid];
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

        var newext = new esri.geometry.Extent({ "xmin": parseFloat(tminx), "ymin": parseFloat(tminy), "xmax": parseFloat(tmaxx), "ymax": parseFloat(tmaxy), "spatialReference": { "wkid": 4326} });
        this.map.setExtent(newext,true);
        
        var xmlhttp = false;
  if (window.XMLHttpRequest)
  {
    xmlhttp = new XMLHttpRequest()
  }
  else if (window.ActiveXObject)// code for IE

  {
    try
    {
      xmlhttp = new ActiveXObject("Msxml2.XMLHTTP")
    } catch (e) {
      try
      {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP")
      } catch (E) {
        xmlhttp=false
      }
    }
  }
  if (xmlhttp) {
        xmlhttp.open("GET", "/proxy.js?"+inputurl, true); // varAsync = true;
        //Set the callback.  This function is called when we 
        xmlhttp.onreadystatechange = function()
        {
            if (xmlhttp.readyState == 4)  //4 is a success
            {        
                
                var xml = xmlhttp.responseText;
                var isIE = false;
              
              var dom = null;
              if (window.DOMParser) {
                  try {
                      dom = (new DOMParser()).parseFromString(xml, "text/xml");
                  }
                  catch (e) { dom = null; }
              }
              else if (window.ActiveXObject) {
                  try {
                      isIE = true;
                      dom = new ActiveXObject('Microsoft.XMLDOM');
                      dom.async = false;
                      if (!dom.loadXML(xml)) // parse error ..

                          window.alert(dom.parseError.reason + dom.parseError.srcText);
                  }
                  catch (e) { dom = null; }
              }
              else {
                  alert("cannot parse xml string!");
                  return false;
              }
              var efobj = dom.getElementsByTagName("Fac");
              var efcount = efobj.length;
              
              widgetobj.countdiv.innerHTML = "# of facilities found: " + efcount;
              if (efcount > 0) {
                  var singletemplate = new esri.InfoTemplate();
                  singletemplate.setTitle("Site Reporting to EPA:");
                  singletemplate.setContent(widgetobj._setEFDesc);
                  for (var i = 0; i < efcount; i++) {
                      var tnodes = efobj[i].childNodes;
                      var regid, lat, lon, addr, facname, city, state, zip;
                      for (var k = 0; k < tnodes.length; k++) {

                          var tnodes = efobj[i].childNodes;
                          var regid, lat, lon, addr, facname, city, state, zip;
                          if (isIE) {
                              //regid = efobj[i].getAttribute("id");
                              regid = efobj[i].getAttribute("id");
                              city = efobj[i].getAttribute("city");
                              state = efobj[i].getAttribute("state");
                              zip = efobj[i].getAttribute("zip");
                              lat = efobj[i].getAttribute("lat");
                              lon = efobj[i].getAttribute("lng");
                          } else {
                              //regid = efobj[i].attributes["id"].value;
                              regid = efobj[i].attributes["id"].value;
                              city = efobj[i].attributes["city"].value;
                              state = efobj[i].attributes["state"].value;
                              zip = efobj[i].attributes["zip"].value;
                              lat = efobj[i].attributes["lat"].value;
                              lon = efobj[i].attributes["lng"].value;
                          }
                          for (var k = 0; k < tnodes.length; k++) {
                              //alert(tnodes[k].nodeName + ": " + tnodes[k].Text + ": " + tnodes[k].nodeValue + ": " + tnodes[k].text + ": " + tnodes[k].textContent + ": " + tnodes[k].innerText + ": " + tnodes[k].innerXML);
                              if (isIE) {
                                  if (tnodes[k].nodeName == "name") facname = tnodes[k].text;
                                  if (tnodes[k].nodeName == "addr") addr = tnodes[k].text;
                              } else {
                                  if (tnodes[k].nodeName == "name") facname = tnodes[k].textContent;
                                  if (tnodes[k].nodeName == "addr") addr = tnodes[k].textContent;
                              }
                          }

                      }
                      //alert(lat + ", " + lon);

                      var pnt = new esri.geometry.Point({ "x": lon, "y": lat, " spatialReference": { " wkid": 4326} });
                      var mgeom = esri.geometry.geographicToWebMercator(pnt);
                      var g = new esri.Graphic(mgeom);
                      g.attributes = { "REPORT_URL": eflinkurl, "REG_ID": regid, "NAME": facname, "ADDRESS": addr, "CITY": city, "STATE": state, "ZIPCODE": zip,"NEARBYREPORTURL": nearbyreporturl };

                      g.setInfoTemplate(singletemplate);
                      graphiclayer.add(g);
                  }

                  widgetobj.dwNode.style.display = "block";                 
                  if (dijit.registry.byId("dwwg" + "_" + widgetobj.id)) {
                      //dojo.style(dijit.byId("dwwg").domNode, "display", "block");
                  } else {
                      widgetobj._downloadEF();
                  }
                  var extent = esri.graphicsExtent(graphiclayer.graphics);
                  if (extent == null) {

                  } else {
                      widgetobj.map.setExtent(extent, true);
                  }
              }
              widgetobj._hideloading();
                                
            }
        }
        xmlhttp.send(null);
  }      
       
    },
    _showloading: function() {
        this.map.disableMapNavigation();
        this.map.hideZoomSlider();
        var x = this.map.width / 2;
        var y = this.map.height / 2;
        if (document.getElementById("loadingdiv")) {
                var dummy = document.getElementById("loadingdiv");
                dummy.style.position = "absolute";
                dummy.style.left = x + "px";
                dummy.style.top = y + "px";
                dummy.style.display = "block";
                dummy.style.backgroundColor = "yellow";
                dummy.innerHTML = "Loading...Please wait.";
            } else {
                var dummy = document.createElement("div");
                dummy.id = "loadingdiv";
                dummy.style.position = "absolute";
                dummy.style.left = x + "px";
                dummy.style.top = y + "px";
                dummy.style.display = "block";
                dummy.style.backgroundColor = "yellow";
                dummy.style.fontSize = "18px";
                dummy.innerHTML = "Loading...Please wait.";
                dummy.style.zIndex = "1000";
                document.body.appendChild(dummy); ;
            }
    },
    _hideloading: function() {
        this.map.enableMapNavigation();
        this.map.showZoomSlider();
        if (document.getElementById("loadingdiv")) {
                var dummy = document.getElementById("loadingdiv");
                document.body.removeChild(dummy);
            }

    },
    _downloadEF: function (parameters) {     
        var dwwidget = new EFdownload({
            map: this.map,
            eftype: "tribe",
            id: 'dwwg' + "_" + this.id,
            parentWidget: this
        }, this.efDownloadNode);
        dwwidget.startup();
    },
_setEFDesc: function (graphic) {
     
    var efgeometry = graphic.geometry;

    var gtype = efgeometry.type;
    
    var coordstr = efgeometry.x + "," + efgeometry.y;
    if (efgeometry.spatialReference.wkid == "102100") {
        var geogeom = esri.geometry.webMercatorToGeographic(efgeometry);
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
_toggleDownload: function () {
    if(this.dwNodeItems.style.display == "none"){
         this.dwNodeItems.style.display = "block"; 
         this.dwNodeAnchor.className = "toggleOff";
     }else{
        this.dwNodeItems.style.display = "none";
        this.dwNodeAnchor.className = "toggle";
    }     

}
  });
});