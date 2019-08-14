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
    var map, view, almatyLayer, identifyTask, home, resultsLayer, backData = [],
    green = [], purple = [], red = [], accepted = 0, declined = 0, active = 0,
    popupTemplate, searchBy = 'change', peakResults = [];
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
        id: "106",//test
        cadastral_number:"20-311-015-268"
      }
      // {
      //   id: "72",
      //   cadastral_number:"20-311-015-268"
      // }
    ];

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

      // view.ui.add("search", "top-left");
      view.ui.add("apz", "top-right");
      view.ui.add("sketch", "top-right");
      view.ui.add("info", "bottom-right");
      view.ui.add("divSearch", "top-left");

      backEnd('apz');

    });

    var apz = document.getElementById("apz");
    var sketch = document.getElementById("sketch");
    var info = document.getElementById("info");
    var service = document.getElementById("service");
    var ulSearch = document.getElementById('ulSearch');
    var input = document.getElementById("inputSearch");
    // var id = document.getElementById("id");
    // var cad = document.getElementById("cad");

    apz.addEventListener("click", function(){
      service.innerHTML = "АПЗ";
      backEnd('apz');
    });

    sketch.addEventListener("click", function(){
      service.innerHTML = "Эскизный проект";
      backEnd('sketch');
    });

    // id.addEventListener('click', () => {
    //   searchBy = 'id';
    //   clearUl();
    // })
    //
    // cad.addEventListener('click', () => {
    //   searchBy = 'cad';
    //   clearUl();
    // })

//////////////////////////////////////////////////////////////////////////
    input.addEventListener('input', function() {

      if (searchBy == 'change') {
        // input.addEventListener('keypress', function(e) {
          if (input.value.length > 0) {
            input.value = '';
            addInvalid();
          }
        // });
      } else if (searchBy == 'cad') {
        var format_and_pos = function(char, backspace) {

          var start = 0;
          var end = 0;
          var pos = 0;
          var separator = "-";
          var value = input.value;

          if (char !== false){
            start = input.selectionStart;
            end = input.selectionEnd;

            if (backspace && start > 0) { // handle backspace onkeydown
              start--;

              if (value[start] == separator){
                start--;
              }
            }
            // To be able to replace the selection if there is one
            value = value.substring(0, start) + char + value.substring(end);

            pos = start + char.length; // caret position
          }

          var d = 0; // digit count
          var dd = 0; // total
          var gi = 0; // group index
          var newV = "";
          var groups = /^\D*3[47]/.test(value) ? [2, 3, 3, 3] : [2, 3, 3, 4];

          for (var i = 0; i < value.length; i++)  {
            if (/\D/.test(value[i])){
                if (start > i){
                  pos--;
                }
            } else {
              if (d === groups[gi]) {
                newV += separator;
                d = 0;
                gi++;

                if (start >= i) {
                  pos++;
                }
              }
              newV += value[i];
              d++;
              dd++;
            }
            if (d === groups[gi] && groups.length === gi + 1) { // max length
              break;
            }
          }
          input.value = newV;

          if (char !== false) {
            input.setSelectionRange(pos, pos);
          }
          checkValue(input.value);
        };

        input.addEventListener('keypress', function(e) {

          if (searchBy == 'change') {
            // input.addEventListener('keypress', function(e) {
              if (input.value.length > 0) {
                input.value = '';
                addInvalid();
              }
            // });
          } else if (searchBy == 'cad') {
            var code = e.charCode || e.keyCode || e.which;
            // Check for tab and arrow keys (needed in Firefox)
            if (code !== 9 && (code < 37 || code > 40) &&
            // and CTRL+C / CTRL+V
            !(e.ctrlKey && (code === 99 || code === 118 || code === 97))) {
              e.preventDefault();

              var char = String.fromCharCode(code);

              // if the character is non-digit
              // OR
              // if the value already contains 15/16 digits and there is no selection
              // -> return false (the character is not inserted)

              if (/\D/.test(char) || (this.selectionStart === this.selectionEnd &&
              this.value.replace(/\D/g, '').length >=
              (/^\D*3[47]/.test(this.value) ? 14 : 15))) { // 15 digits if Amex
                  return false;
              }

              format_and_pos(char);
            }
          } else if (searchBy == 'id') {
            if (input.value == '') {
              clearUl();
              addChangeSearch();
            } else {
              checkValue(input.value);
            }
          }
        });

        // backspace doesn't fire the keypress event
        input.addEventListener('keydown', function(e) {
          if (searchBy == 'change') {
            // input.addEventListener('keypress', function(e) {
              if (input.value.length > 0) {
                input.value = '';
                addInvalid();
              }
            // });
          } else if (searchBy == 'cad') {
            if (e.keyCode === 8 || e.keyCode === 46) { // backspace or delete
                e.preventDefault();
                format_and_pos('', this.selectionStart === this.selectionEnd);
            }
            if (input.value == '') {
              clearUl();
              addChangeSearch();
            }
          } else if (searchBy == 'id') {
            if (input.value == '') {
              clearUl();
              addChangeSearch();
            } else {
              checkValue(input.value);
            }
          }
        });

        input.addEventListener('paste', function(e) {
          e.preventDefault();
          var paste_text = e.clipboardData.getData('Text').match(/\d/g);
          paste_text.forEach((number) => {
            format_and_pos(number);
          })
        });
      } else if (searchBy == 'id') {
        if (input.value == '') {
          clearUl();
          addChangeSearch();
        } else {
          checkValue(input.value);
        }
      }
    });
//////////////////////////////////////////////////////////////////////////
    ulSearch.addEventListener('click', function(e) {
      let id = e.target.id;

      switch (id) {
        case 'cad':
          removeInvalid();
          input.placeholder = 'Введите кад. номер';
          input.value = '';
          searchBy = 'cad';
          input.classList.add('borderInput');
          clearUl();
          break;
        case 'id':
          removeInvalid();
          input.placeholder = 'Введите ID заявления';
          input.value = '';
          searchBy = 'id';
          input.classList.add('borderInput');
          clearUl();
          break;
        case 'changeSearch':
          input.placeholder = 'Выберите тип поиска';
          input.value = '';
          searchBy = 'change';
          clearUl();
          addUlIdCad();
          break;
        default:
          clearUl();
          addChangeSearch();
          goToBuild(e.toElement.attributes[0].nodeValue, e.toElement.innerText);
      }
    })

    const addInvalid = () => {
      document.getElementById('id').classList.add("invalid");
      document.getElementById('cad').classList.add("invalid");
    }

    const removeInvalid = () => {
      id.classList.remove("invalid");
      cad.classList.remove("invalid");
    }

    const goToBuild = (cad, text) => {
      resultsLayer.graphics.items.find(el => {
        if (el.attributes.cadastre_number == cad) {
          input.value = text;
          view.goTo({
            target: el.geometry,
            zoom: 7
          },{
            duration: 500,
            easing: "ease"
          }).then(function() {
            view.popup.open({
              location: el.geometry.centroid,
              title: el.popupTemplate.title,
              content: el.popupTemplate.content,
              featureMenuOpen: true
            });
          });
        }
      })
    }

    const addUlIdCad = () => {
      let liId = document.createElement('li');
      let liCad = document.createElement('li');
      liId.innerHTML = 'Поиск по ID заявления';
      liCad.innerHTML = 'Поиск по кад. номеру';
      liId.setAttribute('id', 'id');
      liId.setAttribute('class', 'liSearch');
      liCad.setAttribute('id', 'cad');
      liCad.setAttribute('class', 'liSearch');
      ulSearch.appendChild(liId);
      ulSearch.appendChild(liCad);
    }

    const addChangeSearch = () => {
      let li = document.createElement('li');
      li.innerHTML = 'Изменить тип поиска';
      li.setAttribute('id', 'changeSearch');
      li.setAttribute('class', 'liSearch');
      ulSearch.appendChild(li);
    }

    const checkNotFound = () => {

      if (input.value.length > 0 && !document.querySelector('ul > li')) {
        if (!document.getElementById('notFound')) {
          notFound();
        }
      }
    }

    const notFound = () => {
      let li = document.createElement('li');
      li.innerHTML = 'Ничего не найдено';
      li.setAttribute('id', 'notFound');
      li.setAttribute('class', 'liSearch');
      ulSearch.appendChild(li);
    }

    const checkValue = value => {
      input.classList.remove('borderInput');
      clearUl();

      if (searchBy == 'cad') {
        backData.forEach((el1) => {
          el1.forEach((el2) => {
            peakResults.forEach((el3) => {
              if (el2.cadastral_number == el3.attributes.cadastre_number) {
                var li_elements = document.querySelectorAll('ul > li');
                var li_repeat = false;

                // if (~el2.cadastral_number.indexOf(value, 0)) {
                if (el2.cadastral_number.substring(0, value.length) == value) {
                  li_elements.forEach((li) => {
                    if (el2.cadastral_number == li.innerHTML) {
                        li_repeat = true;
                    }
                  })
                  if (!li_repeat) {
                    setUl(el2.cadastral_number, '');
                    return;
                  }
                }
              }
            })

          })
        })
      } else if (searchBy == 'id') {

        backData.forEach((el1) => {
          el1.forEach((el2) => {
            peakResults.forEach((el3) => {
              if (el2.cadastral_number == el3.attributes.cadastre_number) {
                var li_elements = document.querySelectorAll('ul > li');
                var li_repeat = false;
                var idText = String(el2.id);
                if (idText.substring(0, value.length) == value) {
                  li_elements.forEach((li) => {
                    if (idText == li.innerHTML) {
                        li_repeat = true;
                    }
                  })
                  if (!li_repeat) {
                    setUl(el2.cadastral_number, idText);
                    return;
                  }
                }
              }
            })
          })
        })
      }
      checkNotFound();
    };

    const clearUl = () => {
      while (ulSearch.firstChild) {
        ulSearch.removeChild(ulSearch.firstChild);
      }
    }

    const setUl = (cad, id) => {
      let li = document.createElement('li');
      if (id.length !== 0) {
        li.setAttribute('name', cad);
        li.innerHTML = id;
      } else {
        li.setAttribute('name', cad);
        li.innerHTML = cad;
      }
      li.setAttribute('class', 'liSearch');
      ulSearch.appendChild(li);

    }

    function backEnd(e) {
      onClickLoader.style.display = 'inline-block';
      if (e == 'apz'){
        service.innerHTML = "АПЗ";

        var xmlhttp = new XMLHttpRequest();
        var url = "https://api.uaig.kz:8843/";
        // var url = "http://uaig.local/";

        xmlhttp.onload = function() {
          if (this.readyState == 4 && this.status == 200) {
            clearData();
            resultsLayer.removeAll();
            setTableData('', '', '');
            var myArr = JSON.parse(this.responseText);
            myFunction(myArr, 'apz');
          } else {
            // Запрос не удался ???
            onClickLoader.style.display = 'none'; // Потом убрать
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
            resultsLayer.removeAll();
            setTableData('', '', '');
            var myArr = JSON.parse(this.responseText);
            myFunction(myArr, 'sketch');
          } else {
            // Запрос не удался ???
            onClickLoader.style.display = 'none'; // Потом убрать
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
                  if (!green.includes(item.cadastral_number)) {
                  // if (checkRepeat(item.cadastral_number, green)) {
                    green.push({
                      id: item.id, // id заявления
                      cadastral_number: trueCad(item.cadastral_number), // Кадастровый номер
                      project_name: item.project_name, // Наименование проектируемого объекта
                      object_type: item.object_type, // Тип объекта
                      object_area: item.object_area, // Площадь здания (кв.м)
                      object_level: item.object_level, // Этажность
                      object_term: item.object_term, // Срок строительства по нормам
                      customer: item.customer, // Заказчик
                      create: item.apz_start //Дата начала обработки заявки
                    });
                  }
                  break;
                case "Отказано":
                  if (!red.includes(item.cadastral_number)) {
                    red.push({
                      id: item.id,
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
                  break;
                case "Черновик":
                  break;
                default:
                  if (!purple.includes(item.cadastral_number)) {
                    purple.push({
                      id: item.id,
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
              }

            }// if

          })// foreach
        } else if (e == 'sketch'){

          arr.forEach(function(item, i) {

            if (checkTrueidSketch(item.id)) {

              switch (item.sketch_status.name) {
                case "Принято":
                  if (findPdf(item.files, false)) {
                    let sketchId = findPdf(item.files, true);
                    green.push({
                      id: item.id,
                      cadastral_number: setCad(item.id), // Кадастровый номер
                      project_name: item.project_name, // Наименование проектируемого объекта
                      object_area: item.common_area, // Общая площадь (м2)
                      object_type: item.object_type, // Тип объекта
                      object_level: item.object_level, // Этажность
                      object_term: item.object_term, // Срок строительства по нормам
                      customer: item.customer, // Заказчик
                      create: item.created_at, //Дата начала обработки заявки
                      sketchId: sketchId, //Ссылка на просмотр pdf файла
                    });
                  } else {
                    green.push({
                      id: item.id,
                      cadastral_number: setCad(item.id), // Кадастровый номер
                      project_name: item.project_name, // Наименование проектируемого объекта
                      object_area: item.common_area, // Общая площадь (м2)
                      object_type: item.object_type, // Тип объекта
                      object_level: item.object_level, // Этажность
                      object_term: item.object_term, // Срок строительства по нормам
                      customer: item.customer, // Заказчик
                      create: item.created_at //Дата начала обработки заявки
                    });
                  }
                  break;
                case "Отказано":
                  red.push({
                    id: item.id,
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
                    id: item.id,
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

    const findPdf = (array, bool) => {
      let id;
      array.forEach((el) => {
        if (el.category_id == 1) {
          id = el.id;
          return;
        }
      })
      if (bool) {
        return id;
      } else {
        return true;
      }
    }

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

      peakResults = response.features.map(function(feature) {

        feature.symbol = symbolColor(feature.attributes.cadastre_number);
        feature.popupTemplate = popupTemplate;
        return feature;
      });
      // checkCadastral(peakResults);
      setTableData(backData[0].length, backData[1].length, backData[2].length);

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

    // Присутствует ли кад.н.
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

      for (var i = 0; i < backData.length; i++) {
        for (var j = 0; j < backData[i].length; j++){
          if (backData[i][j].cadastral_number == e){
            return i;
          }
        }
      }
    }// findStatusCad

    // Вывод данных по кад.н.
    function popupCad(index, cad, status) {
      for (var j = 0; j < backData[index].length; j++){
        if (backData[index][j].cadastral_number == cad){



          if (backData[index][j].sketchId){
            popupTemplate = {
              title: status,
              content: "<b>ID заявления:</b> " + backData[index][j].id + "</br>"+
              "<b>Наименование проектируемого объекта:</b> " + backData[index][j].project_name + "</br>"+
              "<b>Заказчик:</b> " + backData[index][j].customer + "</br>"+
              "<b>Тип объекта:</b> " + backData[index][j].object_type + "</br>"+
              "<b>Площадь здания (кв.м):</b> " + backData[index][j].object_area + "</br>"+
              "<b>Этажность:</b> " + backData[index][j].object_level + "</br>"+
              "<b>Кадастровый номер:</b> " + backData[index][j].cadastral_number + "</br>"+
              "<b>Срок строительства по нормам:</b> " + backData[index][j].object_term + "</br>"+
              "<b>Дата начала обработки заявки:</b> " + backData[index][j].create + "</br>"+
              "<a class='link' onClick='viewOrDownloadFile()'>Просмотр эскизного проекта</a></br>"
            };

            //-----------------------------------
            window.viewOrDownloadFile = () => {
              var id = backData[index][j].id;
              var sketchId = backData[index][j].sketchId;
                  var token = "bQ9kWmn3Fq51D6bfh7pLkuju0zYqTELQnzeKuQM4";
                  var xhr = new XMLHttpRequest();
                  xhr.open("get","https://api.uaig.kz:8843/api/file/download/accepted/" + sketchId + "/" + id, true);
                  xhr.setRequestHeader("Authorization", "Bearer " + token);
                  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
                  xhr.onload = function() {
                    if (xhr.status === 200) {
                      var data = JSON.parse(xhr.responseText);
                      var extenstion = data.file_name.substring(data.file_name.lastIndexOf('.')+1, data.file_name.length);
                      if(extenstion == 'jpg' || extenstion == 'png' || extenstion == 'dwg' || extenstion == 'tiff'){
                        console.log('not pdf');
                        // var image = new Image();
                        // image.src = "data:image/jpg;base64," + data.file;
                        // var w = window.open("");
                        // w.document.write(image.outerHTML);

                        var image = new Image();
                        image.src = "data:image/jpg;base64," + data.file;
                        image.style = "width:inherit!important;height:inherit!important";
                        var win = window.open("#","_blank");
                        var title = data.file_name;
                        win.document.write('<html><title>'+ title +'</title><body style="margin-top:0px; margin-left: 0px; margin-right: 0px; margin-bottom: 0px;"><div class="row"><div class="col-md-12" style="width:100%;height:auto">');
                        win.document.write(image.outerHTML);
                        win.document.write('</div></div></body></html>');
                        // var layer = $(win.document);
                      }else if (extenstion == 'pdf'){
                        console.log('pdf');
                        var objbuilder = '';
                        // objbuilder += ('<object width="100%" height="100%" src="data:application/pdf;base64,');
                        // objbuilder += (data.file );
                        // objbuilder += ('" type="application/pdf" class="internal">');
                        // objbuilder += ('<embed src="data:application/pdf;base64,');
                        // objbuilder += (data.file );
                        // objbuilder += ('" type="application/pdf"  />');
                        // objbuilder += ('</object>');

                        // var win = window.open("#","_blank");
                        var title = data.file_name;

                        // objbuilder += '<html>';
                        // objbuilder += '<body style="margin:0!important">';
                        // objbuilder += '<embed width="100%" height="100%" src="data:application/pdf;base64,'+data.file+'" type="application/pdf" />';
                        // objbuilder += '</body>';
                        // objbuilder += '<html>';
                        var win = = window.open("");
                        win.document.write("<iframe width='100%' height='100%' src='data:application/pdf;base64, " + encodeURI(data.file)+"'></iframe>")

                        // win.document.write('<html><title>'+ title +'</title><body style="margin-top:0px; margin-left: 0px; margin-right: 0px; margin-bottom: 0px;">');
                        win.document.write(objbuilder);
                        // win.document.write('</body></html>');
                        // var layer = $(win.document);
                      }else{
                        alert("Формат файла не поддерживается");
                      }
                    } else {
                      alert('Не удалось загрузить файл');
                    }
                  }
                  xhr.send();
              }
              //-----------------------------------

          } else {
            popupTemplate = {
              title: status,
              content: "<b>ID заявления:</b> " + backData[index][j].id + "</br>"+
              "<b>Наименование проектируемого объекта:</b> " + backData[index][j].project_name + "</br>"+
              "<b>Заказчик:</b> " + backData[index][j].customer + "</br>"+
              "<b>Тип объекта:</b> " + backData[index][j].object_type + "</br>"+
              "<b>Площадь здания (кв.м):</b> " + backData[index][j].object_area + "</br>"+
              "<b>Этажность:</b> " + backData[index][j].object_level + "</br>"+
              "<b>Кадастровый номер:</b> " + backData[index][j].cadastral_number + "</br>"+
              "<b>Срок строительства по нормам:</b> " + backData[index][j].object_term + "</br>"+
              "<b>Дата начала обработки заявки:</b> " + backData[index][j].create + "</br>"
            };
          }
          return popupTemplate;
        }
      }
    }// popupCad



    // Поиск всех кад.н.
    function findCadastr() {
      var text = '';

        backData[0] = green; // accepted
        backData[1] = purple; // active
        backData[2] = red; // declined

      for (var i = 0; i < backData.length; i++) {
        for (var j = 0; j < backData[i].length; j++) {
          if (i == 2 && j == (backData[2].length-1)){ // ???
            text += backData[i][j].cadastral_number;
          } else {
            text += backData[i][j].cadastral_number + "', '";
          }
        }// for j
      }// for i

      return text;
    }// findCadastr

    const checkCadastral = results => {//???

      var infoOne = [];
      var infoTwo = [];
      var infoThree = [];

      backData[0].forEach((el) => {
        results.forEach((el1)=> {
          if (el.cadastral_number == el1.attributes.cadastre_number) {
            infoOne.push(el);
          }
        })
      })
      backData[1].forEach((el) => {
        results.forEach((el1)=> {
          if (el.cadastral_number == el1.attributes.cadastre_number) {
            infoTwo.push(el);
          }
        })
      })
      backData[2].forEach((el) => {
        results.forEach((el1)=> {
          if (el.cadastral_number == el1.attributes.cadastre_number) {
            infoThree.push(el);
          }
        })
      })
      backData[0] = infoOne;
      backData[1] = infoTwo;
      backData[2] = infoThree;
    }

    // Чистка данных
    function clearData() {
      backData = [];
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
