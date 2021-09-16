'use strict';
const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const pdf = require("pdf-creator-node");


const {app, BrowserWindow, Menu, ipcMain, dialog} = electron;

let mainWindow;

app.on('ready', function(){
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'mainWindow.html'),
    protocol: 'file',
    slashes: true
  }))

  mainWindow.on('closed', function(){
    app.quit();
  })

  mainWindow.removeMenu();
});

function read_from_db(file_name){
  try {
    let rawdata = fs.readFileSync(file_name, "utf-8");
    let data = JSON.parse(rawdata);
    console.log(`Datenbank ${file_name} ausgelesen`) //evtl. eine Meldung mithilfe von Snackbar
    return data
  } catch (e) {
    console.log(`Datenbank ${file_name} - Fehler beim lesen.`)
    return []
  }
}

function add_to_db(file_name, obj){
  let data_array = [];
  try {
    let rawdata = fs.readFileSync(file_name, "utf-8");
    data_array = JSON.parse(rawdata);
  } catch (ex){
    console.log('Datenbank war leer oder nicht vorhanden.');
  } finally {
    data_array.push(obj);
    let data_str = JSON.stringify(data_array, null, 2);
    fs.writeFileSync(file_name, data_str, "utf-8");
  }
}

function edit_in_db(file_name, index, obj){
  let data_array = [];
  try {
    let rawdata = fs.readFileSync(file_name, "utf-8");
    data_array = JSON.parse(rawdata);
  } catch (e) {
    console.log(`Datenbank ${file_name} - Fehler beim lesen`);
  } finally {
    data_array.splice(index, 1, obj);
    let data_str = JSON.stringify(data_array, null, 2);
    fs.writeFileSync(file_name, data_str, "utf-8");
  }
}

function remove_from_db(file_name, index){
  let data_array = [];
  try {
    let rawdata = fs.readFileSync(file_name, "utf-8");
    data_array = JSON.parse(rawdata);
  } catch (e) {
    console.log(`Datenbank ${file_name} - Fehler beim lesen.`)
  } finally {
    data_array.splice(index, 1);
    let data_str = JSON.stringify(data_array, null, 2);
    fs.writeFileSync(file_name, data_str, "utf-8");
  }
}

function export_to_pdf(data, output_path) {
  let html = fs.readFileSync(path.join(__dirname, "./plan_template.html"), "utf8");
  let doc = {
    html: html,
    data: data,
    path: output_path,
    type: "",
  };
  let options = {
    format: "A4",
    orientation: "portrait",
    border: "15mm",
    header: {
      height: "5mm"
    },
    footer: {
      height: "5mm",
      contents: {
        default: '<div class="footer">{{page}}/{{pages}}</div>'
      }
    }
  };

  pdf
    .create(doc, options)
    .then((res) => {
      console.log(res);
    })
    .catch((error) => {
      console.log(error);
    })
}

//Messdiener Database-Handling
let filepath_messdiener_db = "messdiener_db.json";

ipcMain.on('messdiener_db:read', function(e){
  let data_array = read_from_db(filepath_messdiener_db); //reads from specific file
  mainWindow.webContents.send('messdiener_db:read', data_array); //sends array with the read data to renderprocess
});

ipcMain.on('messdiener_db:add', function(e, obj){
  add_to_db(filepath_messdiener_db, obj); //adds transferred object to database-file
  mainWindow.webContents.send('messdiener_db:add', obj); //sends transferred object to renderprocess
});

ipcMain.on('messdiener_db:edit', function(e, index, obj){
  edit_in_db(filepath_messdiener_db, index, obj); //exchanges transferred object at given index in the database-file
  mainWindow.webContents.send('messdiener_db:edit', index, obj);
});

ipcMain.on('messdiener_db:remove', function(e, index){
  remove_from_db(filepath_messdiener_db, index); //removes item with transferred index-value from the database-file
  mainWindow.webContents.send('messdiener_db:remove', index); //sends index-value of to-be-removed-item to renderprocess
});

//Messen Database-Handling
let filepath_messen_db = "messen_db.json";

ipcMain.on('messen_db:read', function(e){
  let data_array = read_from_db(filepath_messen_db); //reads from specific file
  mainWindow.webContents.send('messen_db:read', data_array); //sends array with the read data to renderprocess
});

ipcMain.on('messen_db:add', function(e, obj){
  add_to_db(filepath_messen_db, obj); //adds transferred object to database-file
  mainWindow.webContents.send('messen_db:add', obj); //sends transferred object to renderprocess
});

ipcMain.on('messen_db:edit', function(e, index, obj){
  edit_in_db(filepath_messen_db, index, obj); //exchanges transferred object at given index in the database-file
  mainWindow.webContents.send('messen_db:edit', index, obj);
});

ipcMain.on('messen_db:remove', function(e, index){
  remove_from_db(filepath_messen_db, index); //removes item with transferred index-value from the database-file
  mainWindow.webContents.send('messen_db:remove', index); //sends index-value of to-be-removed-item to renderprocess
});

//Export Plan to PDF
ipcMain.on('plan:export', function (e, data){
  dialog.showSaveDialog({
    filters:[{name: 'Adobe PDF', extensions: ['pdf']}],
    buttonLabel:'Export'
  }).then(result => {
    if (result.canceled) {
      console.log(result.canceled);
    } else {
      let filePath = result.filePath;
      if (filePath.slice(filePath.length - 4) != ".pdf") {
        filePath += ".pdf";
      }
      console.log(filePath);
      export_to_pdf(data, filePath);
    }
  })
  //mainWindow.webContents.send('plan:export');
});

ipcMain.on('plan:logo_img', function (e) {
  dialog.showOpenDialog({
    filters:[{name: 'png', extensions: ['png']}],
  }).then(result => {
    if (result.canceled) {
      console.log(result.canceled);
    } else {
      let bitmap = fs.readFileSync(result.filePaths[0], 'base64');
      let logo_img = "data:image/png;base64," + bitmap;
      mainWindow.webContents.send('plan:logo_img', logo_img);
    }
  })
});
