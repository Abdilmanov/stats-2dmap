require([
  "esri/views/MapView",
  "esri/Map",
  "esri/tasks/IdentifyTask",
  "esri/tasks/support/IdentifyParameters",
  "esri/layers/TileLayer",
  "esri/widgets/Home",
  "esri/layers/GraphicsLayer",
  "esri/tasks/QueryTask",
  "esri/tasks/support/Query",
  "esri/layers/FeatureLayer",
  ], function(
    MapView, Map, IdentifyTask, IdentifyParameters, TileLayer, Home, GraphicsLayer,
    QueryTask, Query, FeatureLayer
  ) {
    var map, view, almatyLayer, identifyTask, home, resultsLayer, allMassiv = [],
    green = [], purple = [], red = [], accepted = 0, declined = 0, active = 0,
    popupTemplate;
    var gisBasemapUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer";
    var peaksUrl = "https://gis.uaig.kz/server/rest/services/BaseMapAlm_MIL1/MapServer/13"

    var sketchCad = [
      {
        id: "19",
        cadastral_number: "20-315-026-214"
      },
      {
        id: "64",
        cadastral_number:"20-321-070-153"
      },
      {
        id: "72",
        cadastral_number:"20-311-015-268"
    }];

    // Вытаскиваем слой Базовая_карта_MIL1
    almatyLayer = new TileLayer({
      url: gisBasemapUrl,
      title: "Базовая карта Алматы"
    });

    // Добавление слоев
    resultsLayer = new GraphicsLayer({
      title: "Заявления"
    });

    // Создание карты Базовая_карта_MIL1
    map = new Map({
      layers: [almatyLayer, resultsLayer],
      basemap: null
    });

    // Создание MapView
    view = new MapView({
      container: "viewDiv",
      map: map,
      zoom: 2,
      center: [76.9286100, 43.2566700]
    });


    view.when(function(){
      document.getElementById('main_loading').style.display = 'none';

      view.ui.add("apz", "top-right");
      view.ui.add("sketch", "top-right");
      view.ui.add("info", "bottom-left");

      var apz = document.getElementById("apz");
      var sketch = document.getElementById("sketch");
      var info = document.getElementById("info");
      var service = document.getElementById("service");

      backEnd('apz');

    })

    apz.addEventListener("click", function(){
      service.innerHTML = "АПЗ";
      backEnd('apz');
    });

    sketch.addEventListener("click", function(){
      service.innerHTML = "Эскизный проект";
      backEnd('sketch');
    });

    function backEnd(e){

      if (e == 'apz'){
        service.innerHTML = "АПЗ";

        var xmlhttp = new XMLHttpRequest();
        var url = "https://api.uaig.kz:8843/";
        // var url = "http://uaig.local/";

        xmlhttp.onload = function() {
          if (this.readyState == 4 && this.status == 200) {
            clearData();
            onClickLoader.style.display = 'inline-block';
            resultsLayer.removeAll();
            setTableData('', '', '');
            var myArr = JSON.parse(this.responseText);
            myFunction(myArr, 'apz');
          }
        };

        xmlhttp.open("GET", url + "api/allMapApz", true);
        xmlhttp.setRequestHeader("Content-type", "application/json; charset=UTF-8");
        xmlhttp.send();

      } else if (e == 'sketch'){
        service.innerHTML = "Эскизный проект";

        var xmlhttp = new XMLHttpRequest();
        var url = "https://api.uaig.kz:8843/";
        // var url = "http://uaig.local/";

        xmlhttp.onload = function() {
          if (this.readyState == 4 && this.status == 200) {
            clearData();
            onClickLoader.style.display = 'inline-block';
            resultsLayer.removeAll();
            setTableData('', '', '');
            var myArr = JSON.parse(this.responseText);
            myFunction(myArr, 'sketch');
          }
        };

        xmlhttp.open("GET", url + "api/allMapSketch", true);
        xmlhttp.setRequestHeader("Content-type", "application/json; charset=UTF-8");
        xmlhttp.send();

      } // if else

      function myFunction(arr, e) {

        if (e == 'apz'){
          arr.forEach(function(item, i) {

            if (checkTrueCad(item.cadastral_number)) {

              switch (item.apz_status.name) {
                case "Принято":
                  green.push({
                    cadastral_number: trueCad(item.cadastral_number), // Кадастровый номер
                    project_name: item.project_name, // Наименование проектируемого объекта
                    object_type: item.object_type, // Тип объекта
                    object_area: item.object_area, // Площадь здания (кв.м)
                    object_level: item.object_level, // Этажность
                    object_term: item.object_term, // Срок строительства по нормам
                    customer: item.customer, // Заказчик
                    create: item.apz_start //Дата начала обработки заявки
                  });
                  break;
                case "Отказано":
                  red.push({
                    cadastral_number: trueCad(item.cadastral_number),
                    project_name: item.project_name,
                    object_type: item.object_type,
                    object_area: item.object_area,
                    object_level: item.object_level,
                    object_term: item.object_term,
                    customer: item.customer,
                    create: item.apz_start
                  });
                  break;
                case "Черновик":
                // console.log(item.apz_status.name);
                  break;
                default:
                  purple.push({
                    cadastral_number: trueCad(item.cadastral_number),
                    project_name: item.project_name,
                    object_type: item.object_type,
                    object_area: item.object_area,
                    object_level: item.object_level,
                    object_term: item.object_term,
                    customer: item.customer,
                    create: item.apz_start
                  });
              }

            }// if

          })// foreach
        } else if (e == 'sketch'){

          arr.forEach(function(item, i) {

            if (checkTrueidSketch(item.id)) {

              switch (item.sketch_status.name) {
                case "Принято":
                  green.push({
                    cadastral_number: setCad(item.id), // Кадастровый номер
                    project_name: item.project_name, // Наименование проектируемого объекта
                    object_area: item.common_area, // Общая площадь (м2)
                    object_type: item.object_type, // Тип объекта
                    object_level: item.object_level, // Этажность
                    object_term: item.object_term, // Срок строительства по нормам
                    customer: item.customer, // Заказчик
                    create: item.created_at //Дата начала обработки заявки
                  });
                  break;
                case "Отказано":
                  red.push({
                    cadastral_number: setCad(item.id),
                    project_name: item.project_name,
                    object_area: item.common_area,
                    object_type: item.object_type,
                    object_level: item.object_level,
                    object_term: item.object_term,
                    customer: item.customer,
                    create: item.created_at
                  });
                  break;
                default:
                  purple.push({
                    cadastral_number: setCad(item.id),
                    project_name: item.project_name,
                    object_area: item.common_area,
                    object_type: item.object_type,
                    object_level: item.object_level,
                    object_term: item.object_term,
                    customer: item.customer,
                    create: item.created_at
                  });
              }

            }// if

          })// foreach
        }// else if


        doQuery();

      } // myFunction

    } // backEnd

    // Запрос на arcgis
    function doQuery() {

      var sqlTxt;

      sqlTxt = "cadastre_number IN ('" + findCadastr() + "')";

      var qTask = new QueryTask({
        url: peaksUrl
      });

      var params = new Query({
        returnGeometry: true,
        outFields: ["cadastre_number"]
      });

      params.where = sqlTxt;

      qTask.execute(params)
        .then(getResults)
        .catch(promiseRejected);
    } // doQuery

    // Вызывается каждый раз, когда запрос прошел
    function getResults(response) {

      var peakResults = response.features.map(function(feature) {

        feature.symbol = symbolColor(feature.attributes.cadastre_number);
        feature.popupTemplate = popupTemplate;
        return feature;
      });

      setTableData(allMassiv[0].length, allMassiv[1].length, allMassiv[2].length);

      resultsLayer.addMany(peakResults);
      onClickLoader.style.display = 'none';
    }// getResults

    // Вызывается каждый раз, когда запрос отколняется
    function promiseRejected(error) {
      console.error("Promise rejected: ", error.message);
      onClickLoader.style.display = 'none';
    }// promiseRejected

    // Правильный вид кад.н.
    function trueCad(e) {
      var str = '', num, n;

      num = e.match(/\d/g);
      if (num.length > 12) {
        n = 12;
      } else {
        n = num.length;
      }
      var first = 0, second = 0, third = 0;
      for (var i = 0; i < n; i++) {
        if (first < 2) {
          str += num[i];
          first++;
        } else if (first == 2 && second < 3) {
          if (i == 2) {
            str += '-';
          }
          str += num[i];
          second++;
        } else if (second == 3 && third < 3) {
          if (i == 5) {
            str += '-';
          }
          str += num[i];
          third++;
        } else {
          if (i == 8){
            str += '-';
          }
          str += num[i];
        }
      }
      return str;

    }// trueCad

    // Есть ли кад.н.
    function checkTrueCad(e) {
      if (e && e.substr(0,2) == '20' && e.length >= 11){
        return true;
      } else {
        return false;
      }
    } // checkTrueCad

    // Цвет заявки
    function symbolColor(e) {

      var symbol;

      switch (findStatusCad(e)) {
        case 0:
        popupCad(0, e, 'Принятая заявка');
        symbol = {
          type: "simple-fill",  // autocasts as new SimpleFillSymbol()
          color: 'green',
          style: "solid",
          outline: {  // autocasts as new SimpleLineSymbol()
            color: "green",
            width: 1
          }
        };
          break;
        case 2:
        popupCad(2, e, 'Отказанная заявка');
        symbol = {
          type: "simple-fill",
          color: 'red',
          style: "solid",
          outline: {
            color: "red",
            width: 1
          }
        };
          break;
        case 1:
        popupCad(1, e, 'Активная заявка');
        symbol = {
          type: "simple-fill",
          color: 'purple',
          style: "solid",
          outline: {
            color: "purple",
            width: 1
          }
        };
          break;
      }

      return symbol;
    }// symbolColor

    // Поиск статуса кад.н.
    function findStatusCad(e) {

      for (var i = 0; i < allMassiv.length; i++) {
        for (var j = 0; j < allMassiv[i].length; j++){
          if (allMassiv[i][j].cadastral_number == e){
            return i;
          }
        }
      }
    }// findStatusCad

    // Вывод данных по кад.н.
    function popupCad(index, cad, status) {
      for (var j = 0; j < allMassiv[index].length; j++){
        if (allMassiv[index][j].cadastral_number == cad){

          popupTemplate = {
            title: status,
            content: "<b>Наименование проектируемого объекта:</b> " + allMassiv[index][j].project_name + "</br>"+
            "<b>Заказчик:</b> " + allMassiv[index][j].customer + "</br>"+
            "<b>Тип объекта:</b> " + allMassiv[index][j].object_type + "</br>"+
            "<b>Площадь здания (кв.м):</b> " + allMassiv[index][j].object_area + "</br>"+
            "<b>Этажность:</b> " + allMassiv[index][j].object_level + "</br>"+
            "<b>Кадастровый номер:</b> " + allMassiv[index][j].cadastral_number + "</br>"+
            "<b>Срок строительства по нормам:</b> " + allMassiv[index][j].object_term + "</br>"+
            "<b>Дата начала обработки заявки:</b> " + allMassiv[index][j].create + "</br>"
          };

          return popupTemplate;
        }
      }
    }// popupCad

    // Поиск всех кад.н.
    function findCadastr() {
      var text = '';

        allMassiv[0] = green; // accepted
        allMassiv[1] = purple; // active
        allMassiv[2] = red; // declined

      for (var i = 0; i < allMassiv.length; i++) {
        for (var j = 0; j < allMassiv[i].length; j++) {
          if (i == 2 && j == (allMassiv[2].length-1)){
            text += allMassiv[i][j].cadastral_number;
          } else {
            text += allMassiv[i][j].cadastral_number + "', '";
          }
        }// for j
      }// for i

      return text;
    }// findCadastr

    // Чистка данных
    function clearData() {
      allMassiv = [];
      green = [];
      red = [];
      purple = [];
      accepted = 0;
      declined = 0;
      active = 0;
    }// clearData

    // add data to table
    function setTableData(acc, act, dec) {
      document.getElementById('statusAccepted').innerHTML = acc;
      document.getElementById('statusActive').innerHTML = act;
      document.getElementById('statusDeclined').innerHTML = dec;
    }// setTableData

    // add кад.н. для sketch
    function setCad(id){
      var str = '';
      for (var i = 0; i < sketchCad.length; i++) {
        if (sketchCad[i].id == id){
          str = sketchCad[i].cadastral_number;
          return str;
        }
      }
    }// setCad

    // check id
    function checkTrueidSketch(e){
      for (var i = 0; i < sketchCad.length; i++) {
        if (sketchCad[i].id == e){
          return true;
        }
      }
    }// checkTrueidSketch

  } // require
);
