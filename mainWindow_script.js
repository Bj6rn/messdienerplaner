'use strict';
const $ = require('jquery');
const electron = require('electron')
const {ipcRenderer} = electron;

let messdiener_list = [];
let messen_list = []
let messdiener_ausgewählt = "leer";
let messe_ausgewählt = "";
let gruppen = ["Weiß", "Schwarz", "Rot", "Gelb", "Blau", "Grün", "Lila", "Orange", "Türkis", "Grau", "Braun", "Rosa"]
let plan = "";
let aufgestelltCounter = 1;
let einteilAlgorithmus = 1;
let coronamodus = false;
let titelblatt_boolean = false;


function Datumskonflikt (message) {
  this.message=message;
  this.name="Datumskonflikt";
}

function Zuteilungsfehler(message) {
  this.message=message;
  this.name="Zuteilungsfehler";
}

function Ausschlusskriterium(message) {
  this.message=message;
  this.name="Ausschlusskriterium";
}

class messdiener_obj {
  constructor(vorname, nachname, geburtsdatum, gruppe) {
    this.vorname = vorname;
    this.nachname = nachname;
    this.fullname = `${vorname} ${nachname}`;
    this.geburtsdatum = geburtsdatum;
    this.aufgestellt_counter = 0;
    this.urlaub = false;
    this.gruppe = gruppe;
  }

  get alter_berechnen(){
    let today = new Date();
    let geburtstag = new Date(this.geburtsdatum);
    let alter = today - geburtstag;
    return Math.floor(alter/31536000000) //gibt alter in jahren zurück, Schaltjahre sind nicht berücksichtig
  }
}

class messen_obj {
  constructor(name, wochentag, uhrzeit, md_anzahl,jüngstesAlter, ältestesAlter) {
    this.name = name;
    this.wochentag = wochentag;
    this.uhrzeit = uhrzeit;
    this.md_anzahl = md_anzahl;
    this.jüngstesAlter = jüngstesAlter;
    this.ältestesAlter = ältestesAlter;
  }
}

class plan_obj {
  constructor(title, datum_start) {
    this.title = title;
    this.datum_start = datum_start;
    this.beschreibung = "";
    this.logo_img = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczpieD0iaHR0cHM6Ly9ib3h5LXN2Zy5jb20iPgogIDxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIiBzdHlsZT0iZmlsbDogcmdiKDQ4LCA3MSwgOTQpOyIvPgogIDxwYXRoIHN0eWxlPSJmaWxsOiByZ2IoMjQwLCA4NCwgODQpOyIgZD0iTSAwIDEzNC4yNzkgSCAzODguOSBBIDE1IDE1IDAgMCAxIDQwMy45IDE0OS4yNzkgViAyMjQuMjc5IEggMCBWIDEzNC4yNzkgWiIgYng6c2hhcGU9InJlY3QgMCAxMzQuMjc5IDQwMy45IDkwIDAgMTUgMCAwIDFAZmI4OTQ5MTUiLz4KICA8cGF0aCBzdHlsZT0iZmlsbDogcmdiKDM0LCA0MCwgNDkpOyIgZD0iTSAyMzUuNiAyMjQuMjc5IEggNTAwIFYgMzE0LjI3OSBIIDI1MC42IEEgMTUgMTUgMCAwIDEgMjM1LjYgMjk5LjI3OSBWIDIyNC4yNzkgWiIgYng6c2hhcGU9InJlY3QgMjM1LjYgMjI0LjI3OSAyNjQuNCA5MCAwIDAgMCAxNSAxQDA4YTEyMGYxIi8+CiAgPHBhdGggZD0iTSAzMS4yNzcgMjAwLjI1NyBMIDI2Ljg5NyAyMDAuMjU3IEwgMzIuMzQ3IDE3OC4zODcgTCA1OC41OTcgMTc4LjM4NyBMIDU3LjUwNyAxODIuNzU3IEwgNjEuODg3IDE4Mi43NTcgTCA1Ny41MjcgMjAwLjI1NyBMIDQ4Ljc3NyAyMDAuMjU3IEwgNTMuMTM3IDE4Mi43NTcgTCA0OC43NTcgMTgyLjc1NyBMIDQ0LjM5NyAyMDAuMjU3IEwgMzUuNjQ3IDIwMC4yNTcgTCA0MC4wMDcgMTgyLjc1NyBMIDM1LjYzNyAxODIuNzU3IEwgMzEuMjc3IDIwMC4yNTcgWk0gODguMTQgMjAwLjI1NyBMIDY2LjI3IDIwMC4yNTcgTCA2Ny4zNiAxOTUuODg3IEwgNjIuOTggMTk1Ljg4NyBMIDY2LjI1IDE4Mi43NTcgTCA3MC42MyAxODIuNzU3IEwgNzEuNzIgMTc4LjM4NyBMIDkzLjU5IDE3OC4zODcgTCA5Mi41IDE4Mi43NTcgTCA5Ni44OCAxODIuNzU3IEwgOTQuNyAxOTEuNTA3IEwgNzIuODIgMTkxLjUwNyBMIDcxLjczIDE5NS44ODcgTCA4OS4yMyAxOTUuODg3IEwgODguMTQgMjAwLjI1NyBaIE0gNzUgMTgyLjc1NyBMIDczLjkxIDE4Ny4xMzcgTCA4Ny4wNCAxODcuMTM3IEwgODguMTMgMTgyLjc1NyBMIDc1IDE4Mi43NTcgWk0gMTIzLjEzMyAyMDAuMjU3IEwgOTYuODgzIDIwMC4yNTcgTCA5Ny45NzMgMTk1Ljg4NyBMIDExOS44NTMgMTk1Ljg4NyBMIDEyMC45NDMgMTkxLjUwNyBMIDEwMy40NDMgMTkxLjUwNyBMIDEwNC41MzMgMTg3LjEzNyBMIDEwMC4xNTMgMTg3LjEzNyBMIDEwMS4yNDMgMTgyLjc1NyBMIDEwNS42MjMgMTgyLjc1NyBMIDEwNi43MTMgMTc4LjM4NyBMIDEyOC41ODMgMTc4LjM4NyBMIDEyNy40OTMgMTgyLjc1NyBMIDEwOS45OTMgMTgyLjc1NyBMIDEwOC45MDMgMTg3LjEzNyBMIDEyNi40MDMgMTg3LjEzNyBMIDEyNS4zMTMgMTkxLjUwNyBMIDEyOS42OTMgMTkxLjUwNyBMIDEyOC42MDMgMTk1Ljg4NyBMIDEyNC4yMjMgMTk1Ljg4NyBMIDEyMy4xMzMgMjAwLjI1NyBaTSAxNTguMTI3IDIwMC4yNTcgTCAxMzEuODc3IDIwMC4yNTcgTCAxMzIuOTY3IDE5NS44ODcgTCAxNTQuODQ3IDE5NS44ODcgTCAxNTUuOTM3IDE5MS41MDcgTCAxMzguNDM3IDE5MS41MDcgTCAxMzkuNTI3IDE4Ny4xMzcgTCAxMzUuMTQ3IDE4Ny4xMzcgTCAxMzYuMjM3IDE4Mi43NTcgTCAxNDAuNjE3IDE4Mi43NTcgTCAxNDEuNzA3IDE3OC4zODcgTCAxNjMuNTc3IDE3OC4zODcgTCAxNjIuNDg3IDE4Mi43NTcgTCAxNDQuOTg3IDE4Mi43NTcgTCAxNDMuODk3IDE4Ny4xMzcgTCAxNjEuMzk3IDE4Ny4xMzcgTCAxNjAuMzA3IDE5MS41MDcgTCAxNjQuNjg3IDE5MS41MDcgTCAxNjMuNTk3IDE5NS44ODcgTCAxNTkuMjE3IDE5NS44ODcgTCAxNTguMTI3IDIwMC4yNTcgWk0gMTk3LjUgMjAwLjI1NyBMIDE3MS4yNSAyMDAuMjU3IEwgMTcyLjM0IDE5NS44ODcgTCAxNjcuOTYgMTk1Ljg4NyBMIDE3MS4yMyAxODIuNzU3IEwgMTc1LjYxIDE4Mi43NTcgTCAxNzYuNyAxNzguMzg3IEwgMTk0LjIgMTc4LjM4NyBMIDE5Ni4zOCAxNjkuNjM3IEwgMjA1LjEzIDE2OS42MzcgTCAxOTcuNSAyMDAuMjU3IFogTSAxNzkuOTggMTgyLjc1NyBMIDE3Ni43MSAxOTUuODg3IEwgMTg5Ljg0IDE5NS44ODcgTCAxOTMuMTEgMTgyLjc1NyBMIDE3OS45OCAxODIuNzU3IFpNIDIzMC4yODMgMTc0LjAwNyBMIDIyMS41MzMgMTc0LjAwNyBMIDIyMi42MjMgMTY5LjYzNyBMIDIzMS4zNzMgMTY5LjYzNyBMIDIzMC4yODMgMTc0LjAwNyBaIE0gMjMyLjQ5MyAyMDAuMjU3IEwgMjA2LjI0MyAyMDAuMjU3IEwgMjA3LjMzMyAxOTUuODg3IEwgMjE2LjA4MyAxOTUuODg3IEwgMjE5LjM1MyAxODIuNzU3IEwgMjE0Ljk3MyAxODIuNzU3IEwgMjE2LjA2MyAxNzguMzg3IEwgMjI5LjE5MyAxNzguMzg3IEwgMjI0LjgzMyAxOTUuODg3IEwgMjMzLjU4MyAxOTUuODg3IEwgMjMyLjQ5MyAyMDAuMjU3IFpNIDI2My4xMDYgMjAwLjI1NyBMIDI0MS4yMzYgMjAwLjI1NyBMIDI0Mi4zMjYgMTk1Ljg4NyBMIDIzNy45NDYgMTk1Ljg4NyBMIDI0MS4yMTYgMTgyLjc1NyBMIDI0NS41OTYgMTgyLjc1NyBMIDI0Ni42ODYgMTc4LjM4NyBMIDI2OC41NTYgMTc4LjM4NyBMIDI2Ny40NjYgMTgyLjc1NyBMIDI3MS44NDYgMTgyLjc1NyBMIDI2OS42NjYgMTkxLjUwNyBMIDI0Ny43ODYgMTkxLjUwNyBMIDI0Ni42OTYgMTk1Ljg4NyBMIDI2NC4xOTYgMTk1Ljg4NyBMIDI2My4xMDYgMjAwLjI1NyBaIE0gMjQ5Ljk2NiAxODIuNzU3IEwgMjQ4Ljg3NiAxODcuMTM3IEwgMjYyLjAwNiAxODcuMTM3IEwgMjYzLjA5NiAxODIuNzU3IEwgMjQ5Ljk2NiAxODIuNzU3IFpNIDI4MC41OTkgMjAwLjI1NyBMIDI3MS44NDkgMjAwLjI1NyBMIDI3Ny4yOTkgMTc4LjM4NyBMIDMwMy41NDkgMTc4LjM4NyBMIDMwMi40NTkgMTgyLjc1NyBMIDMwNi44MzkgMTgyLjc1NyBMIDMwMi40NzkgMjAwLjI1NyBMIDI5My43MjkgMjAwLjI1NyBMIDI5OC4wODkgMTgyLjc1NyBMIDI4NC45NTkgMTgyLjc1NyBMIDI4MC41OTkgMjAwLjI1NyBaTSAzMzMuMDkzIDIwMC4yNTcgTCAzMTEuMjIzIDIwMC4yNTcgTCAzMTIuMzEzIDE5NS44ODcgTCAzMDcuOTMzIDE5NS44ODcgTCAzMTEuMjAzIDE4Mi43NTcgTCAzMTUuNTgzIDE4Mi43NTcgTCAzMTYuNjczIDE3OC4zODcgTCAzMzguNTQzIDE3OC4zODcgTCAzMzcuNDUzIDE4Mi43NTcgTCAzNDEuODMzIDE4Mi43NTcgTCAzMzkuNjUzIDE5MS41MDcgTCAzMTcuNzczIDE5MS41MDcgTCAzMTYuNjgzIDE5NS44ODcgTCAzMzQuMTgzIDE5NS44ODcgTCAzMzMuMDkzIDIwMC4yNTcgWiBNIDMxOS45NTMgMTgyLjc1NyBMIDMxOC44NjMgMTg3LjEzNyBMIDMzMS45OTMgMTg3LjEzNyBMIDMzMy4wODMgMTgyLjc1NyBMIDMxOS45NTMgMTgyLjc1NyBaTSAzNjAuNDE2IDE3OC4zODcgTCAzNTkuMzI2IDE4Mi43NTcgTCAzNjMuNjk2IDE4Mi43NTcgTCAzNjIuNjA2IDE4Ny4xMzcgTCAzNTguMjM2IDE4Ny4xMzcgTCAzNTQuOTY2IDIwMC4yNTcgTCAzNDYuMjE2IDIwMC4yNTcgTCAzNTEuNjY2IDE3OC4zODcgTCAzNjAuNDE2IDE3OC4zODcgWiBNIDM2NC43ODYgMTc4LjM4NyBMIDM3Ny45MTYgMTc4LjM4NyBMIDM3Ni44MjYgMTgyLjc1NyBMIDM2My42OTYgMTgyLjc1NyBMIDM2NC43ODYgMTc4LjM4NyBaIiB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLjM1ODIzNDA0Nzg4OTcwOTUsIC0wLjgxNTYyNzk5MjE1MzE2NzcsIC03My42ODE0NzI3NzgzMjAzMSkiIHN0eWxlPSJmaWxsOiByZ2IoMjMyLCAyMzIsIDIzMik7IHdoaXRlLXNwYWNlOiBwcmU7IHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lIHNvbGlkIHJnYig0OCwgNDgsIDQ4KTsiLz4KICA8cGF0aCBkPSJNIDI4My41MzkgMjk3LjQzNSBMIDI3NC43ODkgMjk3LjQzNSBMIDI4MS4zMjkgMjcxLjE4NSBMIDMwNy41NzkgMjcxLjE4NSBMIDMwNi40ODkgMjc1LjU1NSBMIDMxMC44NjkgMjc1LjU1NSBMIDMwOC42ODkgMjg0LjMwNSBMIDMwNC4zMDkgMjg0LjMwNSBMIDMwMy4yMTkgMjg4LjY4NSBMIDI4NS43MTkgMjg4LjY4NSBMIDI4My41MzkgMjk3LjQzNSBaIE0gMjg4Ljk4OSAyNzUuNTU1IEwgMjg2LjgwOSAyODQuMzA1IEwgMjk5LjkzOSAyODQuMzA1IEwgMzAyLjExOSAyNzUuNTU1IEwgMjg4Ljk4OSAyNzUuNTU1IFpNIDM0MS41MDEgMjkzLjA1NSBMIDMxNS4yNTEgMjkzLjA1NSBMIDMxNi4zNDEgMjg4LjY4NSBMIDMyNS4wOTEgMjg4LjY4NSBMIDMzMC41NDEgMjY2LjgwNSBMIDMyNi4xNzEgMjY2LjgwNSBMIDMyNy4yNjEgMjYyLjQzNSBMIDM0MC4zODEgMjYyLjQzNSBMIDMzMy44NDEgMjg4LjY4NSBMIDM0Mi41OTEgMjg4LjY4NSBMIDM0MS41MDEgMjkzLjA1NSBaTSAzNzYuNDkzIDI5My4wNTUgTCAzNTAuMjQzIDI5My4wNTUgTCAzNTEuMzMzIDI4OC42ODUgTCAzNDYuOTUzIDI4OC42ODUgTCAzNDguMDQzIDI4NC4zMDUgTCAzNTIuNDIzIDI4NC4zMDUgTCAzNTMuNTEzIDI3OS45MzUgTCAzNzEuMDEzIDI3OS45MzUgTCAzNzIuMTAzIDI3NS41NTUgTCAzNTQuNjAzIDI3NS41NTUgTCAzNTUuNjkzIDI3MS4xODUgTCAzNzcuNTYzIDI3MS4xODUgTCAzNzYuNDczIDI3NS41NTUgTCAzODAuODUzIDI3NS41NTUgTCAzNzYuNDkzIDI5My4wNTUgWiBNIDM1Ni43OTMgMjg0LjMwNSBMIDM1NS43MDMgMjg4LjY4NSBMIDM2OC44MzMgMjg4LjY4NSBMIDM2OS45MjMgMjg0LjMwNSBMIDM1Ni43OTMgMjg0LjMwNSBaTSAzODkuNjA0IDI5My4wNTUgTCAzODAuODU0IDI5My4wNTUgTCAzODYuMzA0IDI3MS4xODUgTCA0MTIuNTU0IDI3MS4xODUgTCA0MTEuNDY0IDI3NS41NTUgTCA0MTUuODQ0IDI3NS41NTUgTCA0MTEuNDg0IDI5My4wNTUgTCA0MDIuNzM0IDI5My4wNTUgTCA0MDcuMDk0IDI3NS41NTUgTCAzOTMuOTY0IDI3NS41NTUgTCAzODkuNjA0IDI5My4wNTUgWk0gNDQyLjA5NiAyOTMuMDU1IEwgNDIwLjIyNiAyOTMuMDU1IEwgNDIxLjMxNiAyODguNjg1IEwgNDE2LjkzNiAyODguNjg1IEwgNDIwLjIwNiAyNzUuNTU1IEwgNDI0LjU4NiAyNzUuNTU1IEwgNDI1LjY3NiAyNzEuMTg1IEwgNDQ3LjU0NiAyNzEuMTg1IEwgNDQ2LjQ1NiAyNzUuNTU1IEwgNDUwLjgzNiAyNzUuNTU1IEwgNDQ4LjY1NiAyODQuMzA1IEwgNDI2Ljc3NiAyODQuMzA1IEwgNDI1LjY4NiAyODguNjg1IEwgNDQzLjE4NiAyODguNjg1IEwgNDQyLjA5NiAyOTMuMDU1IFogTSA0MjguOTU2IDI3NS41NTUgTCA0MjcuODY2IDI3OS45MzUgTCA0NDAuOTk2IDI3OS45MzUgTCA0NDIuMDg2IDI3NS41NTUgTCA0MjguOTU2IDI3NS41NTUgWk0gNDY5LjQxOCAyNzEuMTg1IEwgNDY4LjMyOCAyNzUuNTU1IEwgNDcyLjY5OCAyNzUuNTU1IEwgNDcxLjYwOCAyNzkuOTM1IEwgNDY3LjIzOCAyNzkuOTM1IEwgNDYzLjk2OCAyOTMuMDU1IEwgNDU1LjIxOCAyOTMuMDU1IEwgNDYwLjY2OCAyNzEuMTg1IEwgNDY5LjQxOCAyNzEuMTg1IFogTSA0NzMuNzg4IDI3MS4xODUgTCA0ODYuOTE4IDI3MS4xODUgTCA0ODUuODI4IDI3NS41NTUgTCA0NzIuNjk4IDI3NS41NTUgTCA0NzMuNzg4IDI3MS4xODUgWiIgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMS4zNjY5MzcwNDEyODI2NTM4LCAtMTMuNjE0MDU5NDQ4MjQyMTg4LCAtMTEyLjI0NTk0MTE2MjEwOTM4KSIgc3R5bGU9ImZpbGw6IHJnYigyMzIsIDIzMiwgMjMyKTsgd2hpdGUtc3BhY2U6IHByZTsgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmUgc29saWQgcmdiKDQ4LCA0OCwgNDgpOyIvPgo8L3N2Zz4=";
    this.einträge = [];
  }

  get datum_end() {
    let index = this.einträge.length - 1;
    return this.einträge[index].datum;
  }

  datum_bestimmen(index, wochentag, uhrzeit) {
    wochentag = wochentag.toLowerCase();
    let days = {"sonntag":0,"montag":1,"dienstag":2,"mittwoch":3,"donnerstag":4,"freitag":5,"samstag":6};
    let date = new Date(this.einträge[index-1].datum);
    date.setDate(date.getDate() + (days[wochentag] + (7-date.getDay())) % 7);
    try {
      date_conflict_check(index, date, wochentag, uhrzeit);
    } catch (e) {
      if (e instanceof Datumskonflikt && e.message == "Datum zu groß") {
        throw e;
      } else if (e instanceof Datumskonflikt && e.message == "Datum zu klein") {
        date.setDate(date.getDate() + 7);
        date_conflict_check(index, date, wochentag, uhrzeit);
      }
    }
    return date.toDateString()
  }

}

class plan_entry_obj {
  constructor(name, wochentag, datum, uhrzeit, messdiener) {
    this.name = name;
    this.wochentag = wochentag;
    this.datum = datum;
    this.uhrzeit = uhrzeit;
    this.messdiener = messdiener;
  }

  get output_lokalesDatum() {
    let wochentag_shorts = {"sonntag":"So","montag":"Mo","dienstag":"Di","mittwoch":"Mi","donnerstag":"Do","freitag":"Fr","samstag":"Sa"};
    let lokales_datum = new Date(this.datum);
    let string = `${wochentag_shorts[this.wochentag.toLowerCase()]} ${lokales_datum.toLocaleDateString()}`;
    return string
  }

  get output_uhrzeit_name() {
    let string = `${this.uhrzeit} Uhr ${this.name}`;
    return string
  }
}

function start_new_plan(obj) {
  plan = new plan_obj(
    obj.title,
    obj.datum_start
  );
  plan.einträge.push({"name":obj.title,"datum":obj.datum_start,"uhrzeit":"00:00"});
  $("#plan-area").empty();
  let header = `<ul id="plan-container"> <li> <h1 class="plan-header">${plan.title}</h1> <div class="add-plan-entry" title="Eintrag hinzufügen"><img src="img/add_white_24dp.svg" alt="ADD"></div> </li> </ul>`;
  $("#plan-area").append(header);
  show_plan_info();
}

function export_plan() {
  //Daten, die im fertigen Plan erscheinen sollen, werden hier gesammelt und an den Exportprozess übergeben
  let plan_export_data = {
    title:plan.title,
    beschreibung:plan.beschreibung,
    logo_img:plan.logo_img,
    datum_start:plan.einträge[1].output_lokalesDatum,
    datum_end:plan.einträge[plan.einträge.length-1].output_lokalesDatum,
    eintraege:[]
  };
  //Alle Einträge (außer der erste :P) werden durchlaufen und die richtigen Daten für den Export gespeichert
  for (var i = 1; i < plan.einträge.length; i++) {
    let entry_export_obj = {
      datum:plan.einträge[i].output_lokalesDatum,
      uhrzeit_name:plan.einträge[i].output_uhrzeit_name,
      messdiener:[]
    }
    for (var j = 0; j < plan.einträge[i].messdiener.length; j++) {
      let md_index = plan.einträge[i].messdiener[j];
      let md_name = messdiener_list[md_index].fullname;
      entry_export_obj.messdiener.push(md_name);
    }
    plan_export_data.eintraege.push(entry_export_obj);
  }
  //Export wird im Main-Process durchgeführt
  ipcRenderer.send('plan:export', plan_export_data);
}

function check_allowed_md_anzahl(md_anzahl) {
  //Der Coronamodus greift nur wenn die normalerweise benötigte Anzahl größer/gleich 2 ist. In allen anderen Fällen wird die gewünschte Anzahl zurückgegeben.
  if (coronamodus == true && md_anzahl >= 2) {
    return 2
  } else {
    return md_anzahl
  }
}

function shuffle(array_length) {
  //erstellt ein Array der Länge von der messdiener_list und füllt es mit den Indexzahlen von der Liste
  let array = new Array(array_length);
  for (var i = 0; i < array_length; i++) {
    array[i] = i;
  }
  //Fisher-Yates Shuffle um das Array zu mischen
  let m = array.length, t, j;
  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    j = Math.floor(Math.random() * m--);
    // And swap it with the current element.
    t = array[m];
    array[m] = array[j];
    array[j] = t;
  }
  //gibt gemischtes Array zurück
  return array;
}

function list_group_members(group_index) {
  let group_color = gruppen[group_index];
  let group_members = new Array();
  for (var i = 0; i < messdiener_list.length; i++) {
    if (group_color == messdiener_list[i].gruppe) {
      group_members.push(i); //speichert den Index des Messdieners im Array
    }
  }
  return group_members
}

//Check Funktionen um zu überprüfen ob bestimmte Vorgaben im Algorithmus zum ausgewählten Messdiener passen; Gibt true zurück wenn der Messdiener in diesem Kriterium zur Messe passt.
function check_age(canidate_index, jüngstesAlter, ältestesAlter) {
  let canidate_age = messdiener_list[canidate_index].alter_berechnen;
  if (jüngstesAlter <= canidate_age && canidate_age <= ältestesAlter) {
    return true //Messdiener ist innerhalb der Altersgrenzen und passt deshalb zur Messe
  } else {
    return false
  }
}

function check_aufgestelltCounter(canidate_index) {
  let canidate_counter = messdiener_list[canidate_index].aufgestellt_counter;
  if (canidate_counter < aufgestelltCounter) {
    return true //Messdiener ist weniger aufgestellt als erlaubt und passt deshalb zur Messe
  } else {
    return false
  }
}

function check_urlaub(canidate_index) {
  if (messdiener_list[canidate_index].urlaub == true) {
    return false //Messdiener ist im Urlaub und passt deshalb nicht zur Messe
  } else {
    return true
  }
}

function check_aufgestellt_before(canidate_index, days, entry_index) {
  let nicht_aufgestellt = true
  for (var i = 1; i <= days; i++) {
    let index = entry_index-i //bei jedem Durchlauf wird der Index um 1 verringert
    if (0 < index && index < plan.einträge.length) { //Index der zu prüfenden Messe, darf nicht größer als die Planlänge sein und nicht kleiner als 1, da dann keine Überpfrüfung mehr möglich ist.
      if (plan.einträge[index].messdiener.includes(canidate_index)) {
        nicht_aufgestellt = false; //Messdiener wurde in dieser Messe gefunden und ist damit nicht mehr zum Einteilen geeignet
        break;
      }
    }
  }
  return nicht_aufgestellt
}

function check_aufgestellt_after(canidate_index, days, entry_index) {
  let nicht_aufgestellt = true
  for (var i = 0; i < days; i++) {
    let index = entry_index+i //bei jedem Durchlauf wird der Index um 1 erhöht
    if (0 < index && index < plan.einträge.length) { //Index der zu prüfenden Messe, darf nicht größer als die Planlänge sein und nicht kleiner als 1, da dann keine Überpfrüfung mehr möglich ist.
      if (plan.einträge[index].messdiener.includes(canidate_index)) {
        nicht_aufgestellt = false; //Messdiener wurde in dieser Messe gefunden und ist damit nicht mehr zum Einteilen geeignet
        break;
      }
    }
  }
  return nicht_aufgestellt
}

function messdiener_zuteilen(md_anzahl, jüngstesAlter, ältestesAlter, entry_index) {
  let md_array = new Array();
  md_anzahl = check_allowed_md_anzahl(md_anzahl);
  let index_array = shuffle(messdiener_list.length);
  let group_array = shuffle(gruppen.length);
  let attempt = 0;
  if (einteilAlgorithmus == 1) { //Algorithmus 1: Teilt die MD zufällig zu, überprüft aber ob das Alter passt und ob der MD noch nicht zu oft aufgestellt wurde
    for (var i = 0; i < md_anzahl; i++) {
      start:
      while (attempt < index_array.length) { //einteilung des Messdieners mit passenden parametern wird solange probiert bis alle Messdiener überprüft wurden
        let canidate_index = index_array[attempt]
        if (check_urlaub(canidate_index) != true) {attempt++; continue start;}
        if (check_age(canidate_index, jüngstesAlter, ältestesAlter) != true) {attempt++; continue start;}
        if (check_aufgestelltCounter(canidate_index) != true) {attempt++; continue start;}
        if (check_aufgestellt_before(canidate_index, 3, entry_index) != true) {attempt++; continue start;}
        if (check_aufgestellt_after(canidate_index, 3, entry_index) != true) {attempt++; continue start;}
        //Wenn bei den Abfragen vorher kein Fehler aufgetreten ist, wird letztlich diese Code ausgeführt und ein passender Messdiener ist damit gefunden
        md_array[i] = canidate_index;
        attempt++;
        break;
      }
    }
  } else if (einteilAlgorithmus == 2) { //Algorithmus 2: Prüft die Gruppen nacheinander auf passende Messdiener, werden in einer Gruppe nicht genügend Messdiener gefunden, wird aus den nächsten Gruppen aufgefüllt.
    loop1:
    for (var i = 0; i < group_array.length; i++) {
      let group_members = list_group_members(group_array[i]);
      let shuffle_list = shuffle(group_members.length);
      loop2:
      for (var j = 0; j < group_members.length; j++) {
        let canidate_index = group_members[shuffle_list[j]];
        if (md_array.length >= md_anzahl) {break loop1;} //wenn genügend MD gefunden wurden, bricht er die Suche ab
        if (check_urlaub(canidate_index) != true) {continue loop2;}
        if (check_age(canidate_index, jüngstesAlter, ältestesAlter) != true) {continue loop2;}
        if (check_aufgestelltCounter(canidate_index) != true) {continue loop2;}
        if (check_aufgestellt_before(canidate_index, 3, entry_index) != true) {continue loop2;}
        if (check_aufgestellt_after(canidate_index, 3, entry_index) != true) {continue loop2;}
        //Wenn bei den Abfragen vorher kein Fehler aufgetreten ist, wird letztlich diese Code ausgeführt und ein passender Messdiener ist damit gefunden
        md_array.push(canidate_index);
      }
    }
  } else if (einteilAlgorithmus == 3) { //Algorithmus 3: Nur ein Plazhalter
    for (var i = 0; i < md_anzahl; i++) {
      start:
      while (attempt < index_array.length) { //einteilung des Messdieners mit passenden parametern wird solange probiert bis alle Messdiener überprüft wurden
        let canidate_index = index_array[attempt]
        if (check_urlaub(canidate_index) != true) {attempt++; continue start;}
        if (check_age(canidate_index, jüngstesAlter, ältestesAlter) != true) {attempt++; continue start;}
        if (check_aufgestelltCounter(canidate_index) != true) {attempt++; continue start;}
        if (check_aufgestellt_before(canidate_index, 5) != true) {attempt++; continue start;}
        if (check_aufgestellt_after(canidate_index, 5) != true) {attempt++; continue start;}
        //if (i > 0) {if (check_group(canidate_index, md_array[0]) != true) {attempt++; continue start;}}
        //Wenn bei den Abfragen vorher kein Fehler aufgetreten ist, wird letztlich diese Code ausgeführt und ein passender Messdiener ist damit gefunden
        md_array[i] = canidate_index;
        attempt++;
        break;
      }
    }
  }
  //Gibt fehler aus wenn nicht genügend passende Messdiener für die Messe gefunden wurden
  if (md_array.length < md_anzahl) {
    throw new Zuteilungsfehler("Es konnten nicht genug passende Messdiener zu dieser Messe gefunden werden.");
  }
  return md_array
}

function add_entry_to_plan(index, messe) {
  try {
    let new_obj = new plan_entry_obj(
      messe.name,
      messe.wochentag,
      plan.datum_bestimmen(index, messe.wochentag, messe.uhrzeit),
      messe.uhrzeit,
      messdiener_zuteilen(messe.md_anzahl, messe.jüngstesAlter, messe.ältestesAlter, index)
    );
    plan.einträge.splice(index, 0, new_obj);
    //Eintrag im Html anzeigen
    let field_1 = plan.einträge[index].output_lokalesDatum;
    let field_2 = plan.einträge[index].output_uhrzeit_name;
    let field_3 = "";
    for (var i = 0; i < plan.einträge[index].messdiener.length; i++) {
      let id = plan.einträge[index].messdiener[i];
      let string = `<li>${messdiener_list[id].fullname}</li>`;
      field_3 += string;
      //Erhöhen des AufgestelltCounter für diesen Messdiener
      messdiener_list[id].aufgestellt_counter++;
    }
    md_show_details(messdiener_ausgewählt);
    let html = `<li class="plan-entry"> <div class="plan-entry-title"> <h4 class="plan-entry-datum">${field_1}</h4> <h4 class="plan-entry-uhrzeit">${field_2}</h4> </div> <ul class="plan-entry-md"> ${field_3} </ul> <div class="delete-plan-entry" title="Eintrag löschen"><img src="img/delete_forever_white_24dp.svg" alt="DELETE"></div> <div class="add-plan-entry" title="Eintrag hinzufügen"><img src="img/add_white_24dp.svg" alt="ADD"></div> </li>`;
    $("#plan-area > ul > li").eq(index-1).after(html);
  } catch (err) {
    if (err instanceof Datumskonflikt) {
      alert("Datumskonflikt: Messe kann hier nicht eingetragen werden");
    } else if (err instanceof Zuteilungsfehler) {
      alert(err.message);
    } else {
      console.log(err);
    }
  }
}

function make_date_obj(datum_str, uhrzeit_str) {
  //macht aus datum und uhrzeit String ein gemeinsames JS-Date-Object
  let date_obj = new Date(datum_str);
  date_obj.setHours(uhrzeit_str.substr(0, 2))
  date_obj.setMinutes(uhrzeit_str.substr(3, 2))
  return date_obj
}

function date_conflict_check(index, datum_vorschlag, wochentag, uhrzeit) {
  let datum = make_date_obj(datum_vorschlag, uhrzeit);
  let datum_before = make_date_obj(plan.einträge[index-1].datum, plan.einträge[index-1].uhrzeit);
  //wenn der Eintrag am Planende gemacht wird, wird nur das datum_before verlichen und sonst auch das datum_after
  if(index < plan.einträge.length) {
    let datum_after = make_date_obj(plan.einträge[index].datum, plan.einträge[index].uhrzeit);
    if (datum.valueOf() >= datum_after.valueOf()) {
      throw new Datumskonflikt("Datum zu groß");
    } else if (datum.valueOf() <= datum_before.valueOf()) {
      throw new Datumskonflikt("Datum zu klein");
    }
  } else {
    if (datum.valueOf() <= datum_before.valueOf()) {
      throw new Datumskonflikt("Datum zu klein");
    }
  }
}

function increment_aufgestelltCounter(index_in_plan){
  //Durchlaufen aller Messdiener für diese Messe
  for (var i = 0; i < plan.einträge[index_in_plan].messdiener.length; i++) {
    //Erhöhen des AufgestelltCounter für diesen Messdiener anhand seinem Index in der Messdienerliste
    let id = plan.einträge[index_in_plan].messdiener[i];
    messdiener_list[id].aufgestellt_counter++;
  }
  md_show_details(messdiener_ausgewählt);
}

function decrement_aufgestelltCounter(index_in_plan){
  //Durchlaufen aller Messdiener für diese Messe
  for (var i = 0; i < plan.einträge[index_in_plan].messdiener.length; i++) {
    //Verkleinern des AufgestelltCounter für diesen Messdiener anhand seinem Index in der Messdienerliste
    let id = plan.einträge[index_in_plan].messdiener[i];
    messdiener_list[id].aufgestellt_counter--;
  }
  md_show_details(messdiener_ausgewählt);
}

function remove_plan_entry(index) {
  decrement_aufgestelltCounter(index);
  plan.einträge.splice(index, 1);
  $("#plan-area > ul > li").eq(index).remove();
}

function add_manual_plan_entry(index) {
  function modal() {
    let headline = "Messe manuell hinzufügen";
    let html = `<div class="modal" id="add-planEntry-modal"> <h1>${headline}</h1> <label for="name">Name</label> <input id="name" type="text" autofocus></input> <label for="wochentag">Wochentag</label> <select id="wochentag"> <option value=""selected hidden></option> <option value="Montag">Montag</option> <option value="Dienstag">Dienstag</option> <option value="Mittwoch">Mittwoch</option> <option value="Donnerstag">Donnerstag</option> <option value="Freitag">Freitag</option> <option value="Samstag">Samstag</option> <option value="Sonntag">Sonntag</option> </select> <label for="uhrzeit">Uhrzeit</label> <input id="uhrzeit" type="time"></input> <label for="messdiener">Messdiener</label> <div id="md_button-container"> <div class="button" id="add_md" title="Messdiener hinzufügen"><img src="img/person_add_alt_1_white_24dp.svg" alt="ADD"></div> <div class="button" id=remove_md title="Messdiener entfernen"><img src="img/delete_forever_white_24dp.svg" alt="DELETE"></div> </div> <div id="add_md-container"></div> </form> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
    $("#modal-section").css("display", "flex");
    $("#modal-section").append(html);
    //Button-Handling
    let md_anzahl = 0;
    let max_md = 12;
    $("#add_md").click(function(){
      if (md_anzahl < max_md) {
        md_anzahl++;
        let options = "";
        for (var i = 0; i < messdiener_list.length; i++) {
          let string = `<option value="${i}">${messdiener_list[i].fullname}, (${messdiener_list[i].aufgestellt_counter})</option>`;
          options += string;
        }
        let messdiener_selector = `<select class="messdiener_select"> <option value="" selected hidden></option> ${options} </select>`;
        $("#add-planEntry-modal > #add_md-container").append(messdiener_selector);
      }
    });
    $("#remove_md").click(function(){
      //Entfernt die zuletzt hinzugefügte MD-Auswahlmöglichkeit
      $("#add-planEntry-modal > #add_md-container").children().last().remove();
      md_anzahl--;
    });
    $(".confirm_btn").click(function(){
      let all_filled = true;
      $("input, select").each(function(){
        let element = $.trim($(this).val());
        if (element == "") {
          all_filled = false;
        }
      });
      if (all_filled){
        let form_content = {}
        form_content["name"] = $.trim($("#add-planEntry-modal > input#name").val());
        form_content["wochentag"] = $.trim($("#add-planEntry-modal > select#wochentag").val());
        form_content["uhrzeit"] = $.trim($("#add-planEntry-modal > input#uhrzeit").val());
        form_content["messdiener_id"] = [];
        $("#add-planEntry-modal > #add_md-container > .messdiener_select").each(function(){
          let element = $.trim($(this).val());
          form_content["messdiener_id"].push(parseInt(element));
        });
        add_to_plan(form_content);
        show_plan_info();
        closeModal();
      } else {
        alert("Alle Felder müssen ausgefüllt werden.")
      }
    });
    $(".cancel_btn").click(closeModal);
  }

  function add_to_plan(form) {
    try {
      let new_obj = new plan_entry_obj(
        form.name,
        form.wochentag,
        plan.datum_bestimmen(index, form.wochentag, form.uhrzeit),
        form.uhrzeit,
        form.messdiener_id
      );
      plan.einträge.splice(index, 0, new_obj);
      //Eintrag im Html anzeigen
      let field_1 = plan.einträge[index].output_lokalesDatum;
      let field_2 = plan.einträge[index].output_uhrzeit_name;
      let field_3 = "";
      for (var i = 0; i < plan.einträge[index].messdiener.length; i++) {
        let id = plan.einträge[index].messdiener[i];
        let string = `<li>${messdiener_list[id].fullname}</li>`;
        field_3 += string;
        //Erhöhen des AufgestelltCounter für diesen Messdiener
        messdiener_list[id].aufgestellt_counter++;
      }
      md_show_details(messdiener_ausgewählt);
      let html = `<li class="plan-entry"> <div class="plan-entry-title"> <h4 class="plan-entry-datum">${field_1}</h4> <h4 class="plan-entry-uhrzeit">${field_2}</h4> </div> <ul class="plan-entry-md"> ${field_3} </ul> <div class="delete-plan-entry" title="Eintrag löschen"><img src="img/delete_forever_white_24dp.svg" alt="DELETE"></div> <div class="add-plan-entry" title="Eintrag hinzufügen"><img src="img/add_white_24dp.svg" alt="ADD"></div> </li>`;
      $("#plan-area > ul > li").eq(index-1).after(html);
    } catch (err) {
      alert("Datumskonflikt: Kann hier nicht eingetragen werden");
    }
  }
  //Ausführen der modal Funktion, die alles weitere zum manuellen Eintrag händelt
  modal();
}

function show_plan_info() {
  if (plan.einträge.length > 1) {
    let titel = plan.title;
    let einträge = plan.einträge.length;
    let startdatum = plan.einträge[1].output_lokalesDatum;
    let enddatum = plan.einträge[einträge-1].output_lokalesDatum;
    let text = `${titel} - ${startdatum} bis ${enddatum} - Einträge: ${einträge-1}`;
    $("#plan_info").text(text);
  } else {
    $("#plan_info").text("Jetzt kannst du oben im Plan neue Einträge hinzufügen.");
  }
}
//Bild des Users wird hinzugefügt und angezeigt
ipcRenderer.on('plan:logo_img', function(e, logo_img){
  plan.logo_img = logo_img;
  $("#plan_logo_img").attr("src",logo_img);
});
//detailanzeige zum ausgewähltem messdiener
function md_show_details(index){
  messdiener_ausgewählt = index; //speichert den Index des ausgewählten Elements
  if (messdiener_ausgewählt >= 0) {
    $("#md-name").text(messdiener_list[messdiener_ausgewählt].fullname);
    $("#md-alter").text(messdiener_list[messdiener_ausgewählt].geburtsdatum + " (" + messdiener_list[messdiener_ausgewählt].alter_berechnen + " Jahre)");
    $("#md-counter").text(messdiener_list[messdiener_ausgewählt].aufgestellt_counter);
    $("#md-urlaub").text(messdiener_list[messdiener_ausgewählt].urlaub);
    $("#md-gruppe").text(messdiener_list[messdiener_ausgewählt].gruppe);
  } else {
    $("#md-name").html("<br>");
    $("#md-alter").html("<br>");
    $("#md-counter").html("<br>");
    $("#md-urlaub").html("<br>");
    $("#md-gruppe").html("<br>");
  }
}
//messdiener aus datei lesen, als objekt in array speichern und in der Liste anzeigen
ipcRenderer.on('messdiener_db:read', function(e, data_array){
  if (data_array.length <= 0) {
    $("#md-area > .noData").show();
  } else {
    //Objekte aus Datei werden in Klassen-Objekte umgewandelt und der Liste hinzugefügt
    for (var i = 0; i < data_array.length; i++) {
      let obj = new messdiener_obj(
        data_array[i].vorname,
        data_array[i].nachname,
        data_array[i].geburtsdatum,
        data_array[i].gruppe
      );
      messdiener_list.push(obj);
      let li_item = `<li class="button">${obj.fullname}</li>`;
      $('#md-list').append(li_item);
    }
  }
  //Bei Click auf Element -> auswahl und anzeige von listenelement -> Messdiener
  $("ul#md-list").on("click", "li", function(){
    $(this).addClass("active").siblings().removeClass("active");
    md_show_details($(this).index());
  });
});
//neuen Messdiener als objekt dem array hinzufügen und in der Liste anzeigen
ipcRenderer.on('messdiener_db:add', function(e, obj){
  $("#md-area > .noData").hide();
  let new_obj = new messdiener_obj(
    obj.vorname,
    obj.nachname,
    obj.geburtsdatum,
    obj.gruppe
  );
  messdiener_list.push(new_obj);
  let li_item = `<li class="button">${new_obj.fullname}</li>`;
  $('#md-list').append(li_item);
});
//Messdiener-Eintrag im array und in der Liste verändern
ipcRenderer.on('messdiener_db:edit', function(e, index, obj){
  let new_obj = new messdiener_obj(
    obj.vorname,
    obj.nachname,
    obj.geburtsdatum,
    obj.gruppe
  );
  messdiener_list.splice(index, 1, new_obj);
  $("#md-list > li").eq(index).text(messdiener_list[index].fullname);
  md_show_details(index);
});
//Messdiener aus array und liste entfernen
ipcRenderer.on('messdiener_db:remove', function(e, index){
  messdiener_list.splice(index, 1);
  messdiener_ausgewählt = "leer";
  md_show_details(messdiener_ausgewählt);
  $("#md-list > li").eq(index).remove();
  if (messdiener_list.length <= 0) {
    $("#md-area > .noData").show();
  }
});
//detailanzeige zur ausgewählten messe
function ms_show_details(index){
  messe_ausgewählt = index; //speichert den Index des ausgewählten Elements
  if (messe_ausgewählt >= 0) {
    $("#ms-name").text(messen_list[messe_ausgewählt].name);
    $("#ms-wochentag").text(messen_list[messe_ausgewählt].wochentag);
    $("#ms-uhrzeit").text(messen_list[messe_ausgewählt].uhrzeit);
    $("#ms-md_anzahl").text(messen_list[messe_ausgewählt].md_anzahl);
    $("#ms-altersgrenzen").text(messen_list[messe_ausgewählt].jüngstesAlter + " bis " + messen_list[messe_ausgewählt].ältestesAlter + " Jahre");
  } else {
    $("#ms-name").html("<br>");
    $("#ms-wochentag").html("<br>");
    $("#ms-uhrzeit").html("<br>");
    $("#ms-md_anzahl").html("<br>");
    $("#ms-altersgrenzen").html("<br>");
  }
}
//messen aus datei lesen, als objekt in array speichern und in der Liste anzeigen
ipcRenderer.on('messen_db:read', function(e, data_array){
  if (data_array.length <= 0) {
    $("#messen-area > .noData").show();
  } else {
    //Objekte aus Datei werden in Klassen-Objekte umgewandelt und der Liste hinzugefügt
    for (var i = 0; i < data_array.length; i++) {
      let obj = new messen_obj(
        data_array[i].name,
        data_array[i].wochentag,
        data_array[i].uhrzeit,
        data_array[i].md_anzahl,
        data_array[i].jüngstesAlter,
        data_array[i].ältestesAlter
      );
      messen_list.push(obj);
      let li_item = `<li class="button">${obj.name}</li>`;
      $('#ms-list').append(li_item);
    }
  }
  //Bei Click auf Element -> auswahl und anzeige von listenelement -> Messe
  $("ul#ms-list").on("click", "li", function(){
    $(this).addClass("active").siblings().removeClass("active");
    ms_show_details($(this).index());
  });
});
//neue Messe als objekt dem array hinzufügen und in der Liste anzeigen
ipcRenderer.on('messen_db:add', function(e, obj){
  $("#messen-area > .noData").hide();
  let new_obj = new messen_obj(
    obj.name,
    obj.wochentag,
    obj.uhrzeit,
    obj.md_anzahl,
    obj.jüngstesAlter,
    obj.ältestesAlter
  );
  messen_list.push(new_obj);
  let li_item = `<li class="button">${obj.name}</li>`;
  $('#ms-list').append(li_item);
});
//Messdiener-Eintrag im array und in der Liste verändern
ipcRenderer.on('messen_db:edit', function(e, index, obj){
  let new_obj = new messen_obj(
    obj.name,
    obj.wochentag,
    obj.uhrzeit,
    obj.md_anzahl,
    obj.jüngstesAlter,
    obj.ältestesAlter
  );
  messen_list.splice(index, 1, new_obj);
  $("#ms-list > li").eq(index).text(messen_list[index].name);
  ms_show_details(index);
});
//messe aus array und liste entfernen
ipcRenderer.on('messen_db:remove', function(e, index){
  messen_list.splice(index, 1);
  messe_ausgewählt = "leer";
  ms_show_details(messe_ausgewählt);
  $("#ms-list > li").eq(index).remove();
  if (messen_list.length <= 0) {
    $("#messen-area > .noData").show();
  }
});

function closeModal(){
  $("#modal-section").hide();
  $("#modal-section").empty();
}

function get_form_input() {
  let all_filled = true;
  let new_obj = {}
  $(".modal > input, .modal > select, .modal > textarea").each(function(){
    let element = $.trim($(this).val());
    if (element == "") {
      all_filled = false;
    } else {
      new_obj[this.id] = element;
    }
  });
  return {all_filled:all_filled, content:new_obj}
}

$(document).ready(function(){
  ipcRenderer.send('messdiener_db:read');
  ipcRenderer.send('messen_db:read');

  $("#plan-area").on("click", ".delete-plan-entry", function(){
    let index = $(this).parent().index()
    try {
      let item = `${plan.einträge[index].output_lokalesDatum}, ${plan.einträge[index].output_uhrzeit_name}`;
      let html = `<div class="modal" id="confirmation-modal"> <h1>Eintrag aus Plan entfernen?</h1> <p>Ausgewählt: ${item}</p> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Ja"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Nein"><img src="img/cancel_white_24dp.svg" alt="NO"></div></div></div>`;
      $("#modal-section").css("display", "flex");
      $("#modal-section").append(html);
      //Button-Handling
      $(".confirm_btn").click(function(){
        remove_plan_entry(index);
        show_plan_info();
        closeModal();
      });
      $(".cancel_btn").click(closeModal);
    } catch (e) {
      console.log(e);
    }
  });

  $("#plan-area").on("click", ".add-plan-entry", function(){
    let index = $(this).parent().index() + 1
    let html = `<div class="modal" id="add-planEntry-modal"> <h1>Messe zu Plan hinzufügen</h1> <select id="messe_select"> <option value="manual_plan_entry">Messe manuell eintragen</option> </select> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
    $("#modal-section").css("display", "flex");
    $("#modal-section").append(html);
    for (var i = 0; i < messen_list.length; i++) {
      $("#messe_select").append(`<option value="${i}">${messen_list[i].name}, ${messen_list[i].wochentag} ${messen_list[i].uhrzeit}</option>`);
    }
    //Button-Handling
    $(".confirm_btn").click(function(){
      let form = get_form_input();
      if (form.all_filled && form.content.messe_select == "manual_plan_entry") {
        closeModal();
        add_manual_plan_entry(index);
      } else if (form.all_filled){
        add_entry_to_plan(index, messen_list[form.content.messe_select]);
        show_plan_info();
        closeModal();
      } else {
        alert("Alle Felder müssen ausgefüllt werden.")
      }
    });
    $(".cancel_btn").click(closeModal);
  });

  $("#settings-area").on("input", "[name='aufgestelltCounter']", function(){
    aufgestelltCounter = $("[name='aufgestelltCounter']").val();
  });

  $("#settings-area").on("input", "[name='einteil-algorithmus']", function(){
    einteilAlgorithmus = $("[name='einteil-algorithmus']:checked").val();
  });

  $("#settings-area").on("input", "[name='coronamodus']", function(){
    coronamodus = $("[name='coronamodus']").is(":checked");
  });

  $("#urlaubsverwaltung").click(function(){
    let html = `<div class="modal" id="urlaubsverwaltung-modal"> <h1>Urlaubsverwaltung</h1> <div id="checkbox-container"></div> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
    $("#modal-section").css("display", "flex");
    $("#modal-section").append(html);
    for (var i = 0; i < messdiener_list.length; i++) {
      if (messdiener_list[i].urlaub) {
        $("#checkbox-container").append(`<div class="urlaub-checkbox"> <input id="checkbox${i}" type="checkbox" value="${i}" checked> <label for="checkbox${i}">${messdiener_list[i].fullname}</label> </div>`);
      } else {
        $("#checkbox-container").append(`<div class="urlaub-checkbox"> <input id="checkbox${i}" type="checkbox" value="${i}"> <label for="checkbox${i}">${messdiener_list[i].fullname}</label> </div>`);
      }
    }
    //Button-Handling
    $(".confirm_btn").click(function(){
      $(".urlaub-checkbox > input[type=checkbox]").each(function(){
        let md_index = $.trim($(this).val());
        if ($(this).is(":checked")) {
          messdiener_list[md_index].urlaub = true;
        } else {
          messdiener_list[md_index].urlaub = false;
        }
      });
      md_show_details(messdiener_ausgewählt);
      closeModal();
    });
    $(".cancel_btn").click(closeModal);
  });

  $("#newPlan_btn").click(function(){
    let html = `<div class="modal" id="new-pl-modal"> <h1>Neuen Plan erstellen</h1> <label for="title">Titel</label> <input id="title" type="text" autofocus></input> <label for="datum_start">Startdatum</label> <input id="datum_start" type="date"></input> <p class="modal-hint">Alle aktuellen Einträge werden überschrieben.</p> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
    $("#modal-section").css("display", "flex");
    $("#modal-section").append(html);
    //Button-Handling
    $(".confirm_btn").click(function(){
      let form = get_form_input();
      if (form.all_filled){
        start_new_plan(form.content);
        closeModal();
      } else {
        alert("Alle Felder müssen ausgefüllt werden.")
      }
    });
    $(".cancel_btn").click(closeModal);
  });

  $("#export_btn").click(function(){
    if (plan != "" && plan.einträge.length > 1) {
      let html = `<div class="modal" id="export-plan-modal"> <h1>Plan exportieren</h1> <label for="title">Titel</label> <input id="title" type="text" autofocus value="${plan.title}"> <label for="beschreibung">Beschreibung</label> <textarea id="beschreibung" rows="4">${plan.beschreibung}</textarea> <label for="logo">Logo</label> <div class="button" id="choose_img_btn">eignes Bild auswählen</div> <img id="plan_logo_img" src="${plan.logo_img}" alt="Logo messdienerplaner"> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
      $("#modal-section").css("display", "flex");
      $("#modal-section").append(html);
      //Button-Handling
      $("#choose_img_btn").click(function(){
        ipcRenderer.send('plan:logo_img');
      })
      $(".confirm_btn").click(function(){
        let form = get_form_input();
        if (form.all_filled){
          plan.title = form.content.title;
          plan.beschreibung = form.content.beschreibung;
          export_plan();
          closeModal();
        } else {
          alert("Alle Felder müssen ausgefüllt werden.")
        }
      });
      $(".cancel_btn").click(closeModal);
    } else {
      alert("Da steht noch zu wenig im Plan um ihn jetzt schon zu exportieren.");
    }
  });

  $("#md-area > .edit-area > .add_btn").click(function(){
    let headline = "Messdiener hinzufügen";
    let html = `<div class="modal" id="add-md-modal"> <h1>${headline}</h1> <label for="vorname">Vorname</label> <input id="vorname" type="text" autofocus></input> <label for="nachname">Nachname</label> <input id="nachname" type="text"></input> <label for="geburtsdatum">Geburtsdatum</label> <input id="geburtsdatum" type="date"></input> <label for="gruppe">Gruppe</label> <select id="gruppe"> <option id="Weiß" value="Weiß"selected>Weiß</option> <option id="Schwarz" value="Schwarz">Schwarz</option> <option id="Rot" value="Rot">Rot</option> <option id="Gelb" value="Gelb">Gelb</option> <option id="Blau" value="Blau">Blau</option> <option id="Grün" value="Grün">Grün</option> <option id="Lila" value="Lila">Lila</option> <option id="Orange" value="Orange">Orange</option> <option id="Türkis" value="Türkis">Türkis</option> <option id="Grau" value="Grau">Grau</option> <option id="Braun" value="Braun">Braun</option> <option id="Rosa" value="Rosa">Rosa</option> </select> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
    $("#modal-section").css("display", "flex");
    $("#modal-section").append(html);
    //Button-Handling
    $(".confirm_btn").click(function(){
      let form = get_form_input();
      if (form.all_filled){
        ipcRenderer.send('messdiener_db:add', form.content);
        closeModal();
      } else {
        alert("Alle Felder müssen ausgefüllt werden.")
      }
    });
    $(".cancel_btn").click(closeModal);
  });

  $("#md-area > .edit-area > .edit_btn").click(function(){
    try {
      let headline = "Messdiener bearbeiten";
      let given_values = messdiener_list[messdiener_ausgewählt];
      let html = `<div class="modal" id="add-md-modal"> <h1>${headline}</h1> <label for="vorname">Vorname</label> <input id="vorname" type="text" value="${given_values.vorname}" autofocus></input> <label for="nachname">Nachname</label> <input id="nachname" type="text" value="${given_values.nachname}"></input> <label for="geburtsdatum">Geburtsdatum</label> <input id="geburtsdatum" type="date" value="${given_values.geburtsdatum}"></input> <label for="gruppe">Gruppe</label> <select id="gruppe"> <option id="${given_values.gruppe}" value="${given_values.gruppe}"selected hidden>${given_values.gruppe}</option> <option id="Weiß" value="Weiß">Weiß</option> <option id="Schwarz" value="Schwarz">Schwarz</option> <option id="Rot" value="Rot">Rot</option> <option id="Gelb" value="Gelb">Gelb</option> <option id="Blau" value="Blau">Blau</option> <option id="Grün" value="Grün">Grün</option> <option id="Lila" value="Lila">Lila</option> <option id="Orange" value="Orange">Orange</option> <option id="Türkis" value="Türkis">Türkis</option> <option id="Grau" value="Grau">Grau</option> <option id="Braun" value="Braun">Braun</option> <option id="Rosa" value="Rosa">Rosa</option> </select> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
      $("#modal-section").css("display", "flex");
      $("#modal-section").append(html);
      //Button-Handling
      $(".confirm_btn").click(function(){
        let form = get_form_input();
        if (form.all_filled){
          ipcRenderer.send('messdiener_db:edit', messdiener_ausgewählt, form.content);
          closeModal();
        } else {
          alert("Alle Felder müssen ausgefüllt werden.")
        }
      });
      $(".cancel_btn").click(closeModal);
    } catch (e) {
      console.log(e);
    }
  });

  $("#md-area > .edit-area > .delete_btn").click(function(){
    try {
      let headline = "Messdiener Löschen?";
      let item = messdiener_list[messdiener_ausgewählt].fullname;
      let html = `<div class="modal" id="confirmation-modal"> <h1>${headline}</h1> <p>Ausgewählt: ${item}</p> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Ja"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Nein"><img src="img/cancel_white_24dp.svg" alt="NO"></div></div></div>`;
      $("#modal-section").css("display", "flex");
      $("#modal-section").append(html);
      //Button-Handling
      $(".confirm_btn").click(function(){
        ipcRenderer.send('messdiener_db:remove', messdiener_ausgewählt);
        closeModal();
      });
      $(".cancel_btn").click(closeModal);
    } catch (e) {
      console.log(e);
    }
  });

  $("#messen-area > .edit-area > .add_btn").click(function(){
    let headline = "Messe hinzufügen";
    let html = `<div class="modal" id="add-ms-modal"> <h1>${headline}</h1> <label for="name">Name</label> <input id="name" type="text" autofocus></input> <label for="wochentag">Wochentag</label> <select id="wochentag"> <option value=""selected hidden></option> <option value="Montag">Montag</option> <option value="Dienstag">Dienstag</option> <option value="Mittwoch">Mittwoch</option> <option value="Donnerstag">Donnerstag</option> <option value="Freitag">Freitag</option> <option value="Samstag">Samstag</option> <option value="Sonntag">Sonntag</option> </select> <label for="uhrzeit">Uhrzeit</label> <input id="uhrzeit" type="time"></input> <label for="md_anzahl">Messdiener Anzahl</label> <input id="md_anzahl" type="number" min="0" max="8"></input> <label for="jüngstesAlter">jüngste Messdiener</label> <input id="jüngstesAlter" type="number" min="0" max="99"></input> <label for="ältestesAlter">älteste Messdiener</label> <input id="ältestesAlter" type="number" min="0" max="99"></input> </form> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
    $("#modal-section").css("display", "flex");
    $("#modal-section").append(html);
    //Button-Handling
    $(".confirm_btn").click(function(){
      let form = get_form_input();
      if (form.all_filled){
        ipcRenderer.send('messen_db:add', form.content);
        closeModal();
      } else {
        alert("Alle Felder müssen ausgefüllt werden.")
      }
    });
    $(".cancel_btn").click(closeModal);
  });

  $("#messen-area > .edit-area > .edit_btn").click(function(){
    try {
      let headline = "Messe bearbeiten";
      let given_values = messen_list[messe_ausgewählt];
      let html = `<div class="modal" id="add-ms-modal"> <h1>${headline}</h1> <label for="name">Name</label> <input id="name" type="text" value="${given_values.name}" autofocus></input> <label for="wochentag">Wochentag</label> <select id="wochentag"> <option value="${given_values.wochentag}"selected hidden>${given_values.wochentag}</option> <option value="Montag">Montag</option> <option value="Dienstag">Dienstag</option> <option value="Mittwoch">Mittwoch</option> <option value="Donnerstag">Donnerstag</option> <option value="Freitag">Freitag</option> <option value="Samstag">Samstag</option> <option value="Sonntag">Sonntag</option> </select> <label for="uhrzeit">Uhrzeit</label> <input id="uhrzeit" type="time" value="${given_values.uhrzeit}"></input> <label for="md_anzahl">Messdiener Anzahl</label> <input id="md_anzahl" type="number" min="0" max="8" value="${given_values.md_anzahl}"></input> <label for="jüngstesAlter">jüngste Messdiener</label> <input id="jüngstesAlter" type="number" min="0" max="99" value="${given_values.jüngstesAlter}"></input> <label for="ältestesAlter">älteste Messdiener</label> <input id="ältestesAlter" type="number" min="0" max="99" value="${given_values.ältestesAlter}"></input> </form> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Speichern"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Abbrechen"><img src="img/cancel_white_24dp.svg" alt="NO"></div> </div> </div>`;
      $("#modal-section").css("display", "flex");
      $("#modal-section").append(html);
      //Button-Handling
      $(".confirm_btn").click(function(){
        let form = get_form_input();
        if (form.all_filled){
          ipcRenderer.send('messen_db:edit', messe_ausgewählt, form.content);
          closeModal();
        } else {
          alert("Alle Felder müssen ausgefüllt werden.")
        }
      });
      $(".cancel_btn").click(closeModal);
    } catch (e) {
      console.log(e);
    }
  });

  $("#messen-area > .edit-area > .delete_btn").click(function(){
    try {
      let headline = "Messe Löschen?";
      let item = messen_list[messe_ausgewählt].name;
      let html = `<div class="modal" id="confirmation-modal"> <h1>${headline}</h1> <p>Ausgewählt: ${item}</p> <div class="two_btn-wrapper"> <div class="confirm_btn" title="Ja"><img src="img/check_circle_white_24dp.svg" alt="YES"></div> <div class="cancel_btn" title="Nein"><img src="img/cancel_white_24dp.svg" alt="NO"></div></div></div>`;
      $("#modal-section").css("display", "flex");
      $("#modal-section").append(html);
      //Button-Handling
      $(".confirm_btn").click(function(){
        ipcRenderer.send('messen_db:remove', messe_ausgewählt);
        closeModal();
      });
      $(".cancel_btn").click(closeModal);
    } catch (e) {
      console.log(e);
    }
  });
});
