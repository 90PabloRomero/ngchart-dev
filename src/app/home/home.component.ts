import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Position } from '../models/position';
import { Sheet } from '../models/sheet';
import { Project } from '../models/project';
import { Contact } from '../models/contact';
import { ContactRight } from '../models/contactright';
import { NgbAccordionConfig } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { NgbPanelChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import * as _ from 'lodash'
import { JointComponent } from "./joint.component";
import * as joint from 'jointjs';
import { ContactService } from "../contact.service"
import { CdkDragDrop, CdkDrag, CdkDragStart, CdkDragMove } from '@angular/cdk/drag-drop';
import { saveAs } from 'file-saver';
import Canvg, { presets } from 'canvg';
import { AutocompleteLibModule } from 'angular-ng-autocomplete';
import { SelectContactComponent } from '../select-contact/select-contact.component';
import { Router } from '@angular/router';
import { GlobalService } from '../global.service';


const positionsName = [];

const urlApi = GlobalService.apiURL;

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    providers: [NgbAccordionConfig]

})
export class HomeComponent implements OnInit, AfterViewInit {
    @ViewChild('tree') treeOrg;
    @ViewChild('accordion') accordion;
    @ViewChild('selectContactComp') selectContactComp;  // autocomplete for contacts
    @ViewChild('treenodesearchinput') treeNodeSearchInput;
    @ViewChild('paperView', { // jointjs paper 
        static: true
    }) paperView: JointComponent;
    nodeType: any = "child";
    name = 'OrgChart';
    modalWindow: NgbModalRef;
    modalWindowConfirm: NgbModalRef;
    sheetToEdit: Sheet;
    projectToEdit: Project;
    projects: Project[];
    contactToEdit: Contact;
    // contacts: Contact[];
    sheets: Sheet[]; //active sheets non view
    projectSheets: Sheet[]; //all sheets from project
    sheetSelected: Sheet;
    projectSelected: Project;
    nodeName: any;
    newNodeCode: any;
    newNodeName: any;
    nodePositionCode: any;
    unitY: any = 1;
    unitX: any = 0;
    positionCurrent: Position;
    treeNodeCurrent: any;
    tree: any;
    active: any;
    panelExpanded: boolean = false;
    isProjectFisrtTreeUpdate: boolean = true;
    panelsIds: any = {};
    activeSheets: any = {};
    sheetNodesOrigView: any; //if view is temp ex contracted nodes
    isSheetNodesTempView: boolean = false; //if view is temp ex contracted nodes
    nodeGraphLevelSelected: any;
    activeId: any;
    activeDetail: any;
    nodes = [];
    positions = {};
    options = {  // angular tree comp config 
        allowDrag: (node) => {
            return true;
        },
        allowDrop: (node) => {
            return true;
        },
        allowDragoverStyling: true,
        levelPadding: 10, //20
        animateExpand: true,
        scrollOnActivate: true,
        animateSpeed: 30,
        animateAcceleration: 1.2,
        nodeHeight: 23, //23

    };

    textSearch = "";
    textSearch2 = "";
    filterNodeByLevel = 0;
    graphShapes: any;
    paperShapes: any;
    userId: any;
    userName: any;
    accessToken: any;
    userContacts: any = [];

    constructor(
        private modalService: NgbModal,
        config: NgbAccordionConfig,
        private http: HttpClient,
        private contactService: ContactService,
        private router: Router,
        public globalService: GlobalService,

    ) {
        config.closeOthers = false;
        config.type = 'light';
    }


    ngAfterViewInit(): void {}

   ngOnInit(): void {
        this.userId = localStorage.getItem('userId');
        this.userName = localStorage.getItem('name');
        this.accessToken = localStorage.getItem('accessToken');
        /*  if(!this.userId||!this.accessToken){
             this.router.navigate(['/login']);
          }*/
        this.contactService.getUserContacts();
        this.paperView.urlApi = urlApi;
        this.getProjects();
        this.getContacts();
        this.sheetSelected = new Sheet;
        this.sheetSelected.SheetName = "Sheet"
        this.projectSelected = new Project;
        this.projectSelected.ProjectName = "Project"
        this.positionCurrent = new Position;
        this.isSheetNodesTempView = false;
        this.sheets = [];
        this.panelsIds[1] = false;
        this.panelsIds[2] = false;
        this.panelsIds[3] = true;
    }

    onTreeEvent(event: any) {  // any event on tree component 
        if (event.eventName == 'moveNode') { // if a tree node is moved updates all sheets and related data
            this.updateAllSheetsFromTreeNode();
            return
        }
    }

    lastNodeSearchedId: any;
    lastNodeSearchedKeyword: any;
    findTreeNodeByName(tree: any, search: any) {
        var regex = new RegExp(search, 'gi');
        let node = tree.treeModel.getNodeBy((node) => node.data.name.match(regex))
        if (node) {
            node.setActiveAndVisible();
        }
        this.lastNodeSearchedKeyword = this.treeNodeSearchInput.nativeElement.value
        if (node) {
            this.lastNodeSearchedId = node.data.id;
        }
    }

    logout() {
        this.userId = localStorage.removeItem('userId');
        this.userName = localStorage.removeItem('name');
        this.accessToken = localStorage.removeItem('accessToken');
        this.router.navigate(['/login']);

    }


    getNextNodeCoincidence(node: any) {
        var regex = new RegExp(this.lastNodeSearchedKeyword, 'gi');
        if (!node) { return };
        if (node.data.name.match(regex)) {
            node.setActiveAndVisible();
            return;
        } else {
            let next = node.findNextNode()
            if (!next) { return };
            this.getNextNodeCoincidence(next);
        }

    }
    treeFocusNextNode() { 
        let focused = this.treeOrg.treeModel.getFocusedNode();
        if (!focused) {
            this.treeOrg.treeModel.focusPreviousNode()
        } else {
            this.getNextNodeCoincidence(focused.findNextNode());
        }
    }

    getPreviousNodeCoincidence(node: any) {
        var regex = new RegExp(this.lastNodeSearchedKeyword, 'gi');
        if (!node) { return };
        if (node.data.name.match(regex)) {
            node.setActiveAndVisible();
            return;
        } else {
            let previous = node.findPreviousNode()
            if (!previous) { return };
            this.getPreviousNodeCoincidence(previous);
        }

    }
    treeFocusPreviousNode() {
        let focused = this.treeOrg.treeModel.getFocusedNode();
        if (!focused) {
            this.treeOrg.treeModel.focusPreviousNode()
        } else {
            this.getPreviousNodeCoincidence(focused.findPreviousNode());
        }
    }

   changeDedicationRegime(positionCurrent:any,tree:any){  // change position dedication regime
        if (this.sheetSelected.ID != 0) {
            let sheetNode = _.find(this.paperView.graph.getElements(), (item) => { return item.attributes.tree_id ==  positionCurrent.ID })
            let positionType='postition'; // 'position'='full time'
            if(positionCurrent.DedicationRegime=='temporal'){
               this.paperView.configCell(sheetNode,positionCurrent.PositionName.replace('(a) ',''),'temporal')
            }else{
                this.paperView.configCell(sheetNode,positionCurrent.PositionName.replace('(a) ',''),'position')
            }
            this.saveSheet(this.sheetSelected);
        } 
        this.savePosition(positionCurrent,tree)
   }

    graphNodeSelected(event: any) {   // on graph(sheet) node selected
        this.treeNodeCurrent = this.treeOrg.treeModel.getNodeBy((item) => { return event.attributes.tree_id == item.data.id });
        if (this.treeNodeCurrent) {
            this.positionCurrent = this.treeNodeCurrent.data.position;
            this.positionCurrent.ID = this.treeNodeCurrent.data.id;
            this.positionCurrent.DedicationRegime='position';

            if(event.attributes.position_type=="temporal"){
                this.positionCurrent.DedicationRegime='temporal';
            }

            /*if(!this.positionCurrent.DedicationRegime||    this.positionCurrent.DedicationRegime==''){
                this.positionCurrent.DedicationRegime='position';
            }
            */            

        }

        if (!this.treeNodeCurrent.data.privacy) {
            this.treeNodeCurrent.data.privacy = {
                enableAditional: false,
                enableException: false,
                contactsAditional: [],
                contactsException: []
            }
        }
        if (!this.treeNodeCurrent.data.attachments) {
            this.treeNodeCurrent.data.attachments = [];

        }
        if (!this.treeNodeCurrent.data.functionalrels) {
            this.treeNodeCurrent.data.functionalrels = [];
        }

        if (!this.treeNodeCurrent.data.employees_position) {
            this.treeNodeCurrent.data.employees_position = [];
        }
    }


    onNavChange(changeEvent: NgbNavChangeEvent) {  // when selecting sheet tab 
        this.loadSheetByID(changeEvent.nextId);
    }

    onAccordionChange(changeEvent: NgbPanelChangeEvent) { // Accordion change event
        this.panelsIds[changeEvent.panelId] = changeEvent.nextState;
    }

    getProjects() {   //currently get all projects, TODO: need to filter by user, external  contacts api server were not defined yet
        this.http.get < any > (urlApi + '/project')
            .subscribe(
                (any) => {
                    if (any) {
                        this.projects = any;
                    }
                },
                err => {
                    if (err.error && err.error.message) {
                        alert(err.error.message);
                    }
                    return;
                }
            );
    }
    getContacts() {   //currently get all projects, TODO: need to filter by user, external  contacts api server were not defined yet
        this.http.get < any > (urlApi + '/contact')
            .subscribe(
                (any) => {
                    if (any) {
                        this.contacts = any;
                    }
                },
                err => {
                    if (err.error && err.error.message) {
                        alert(err.error.message);
                    }
                    return;
                }
            );
    }

    getSheets(project: any) { //get all sheets by project
        this.sheetSelected = new Sheet;
        this.sheetSelected.SheetName = "Sheet"
        this.isSheetNodesTempView = false;
        this.http.get < any > (urlApi + '/project/' + project.ID + '/sheets')
            .subscribe(
                (any) => {
                    if (any) {
                        this.projectSheets = any;
                        this.activeSheets = {};
                    }
                },
                err => {
                    if (err.error && err.error.message) {
                        alert(err.error.message);
                    }
                    return;
                }
            );
    }

    deleteCurrentSheet() { // delete active sheet
        if (this.sheetSelected.ID != 0) {
            this.http.delete < any > (urlApi + '/sheet/' + this.sheetSelected.ID)
                .subscribe(
                    (any) => {
                        if (any) {
                            this.paperView.graph.clear(); // instead of clearSheetSelected()
                            this.removeSheetFromView(this.sheetSelected);
                            this.getSheets(this.projectSelected);
                        }
                    },
                    err => {
                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        }
    }

    confirmDelete(popover) { // confirm 
        if (this.sheetSelected.ID) {
            if (popover.isOpen()) {
                popover.close();
            } else {
                popover.open();
            }
        }
        return
    }


    loadProject(project: any) {  // load project
        this.positionCurrent = new Position;
        this.accordion.expand("2") //open accordeon tree to activate tree
        this.isProjectFisrtTreeUpdate = true;
        this.projectSelected = project;
        this.sheets = [];
        this.activeSheets = {};
        let allData = {
            nodes: [],
            positions: {}
        }
        if (this.projectSelected.Data != "") {
            allData = JSON.parse(this.projectSelected.Data);
        }
        this.nodes = [];
        if (allData && allData.nodes) {
            this.nodes = allData.nodes;
            setTimeout(()=>{
               let root = this.treeOrg.treeModel.getFirstRoot();   
               if(root)  { root.setActiveAndVisible();}
            },300)
        }
        this.paperView.graph.clear(); // instead of clearSheetSelected()

        this.getSheets(project);
        return;
    }

    loadSheetByID(sheetID: any) {
        this.sheets.forEach((sheet) => {
            if (sheet.ID == sheetID) {
                this.loadSheet(sheet);
                return;
            }
        })

    }


    async exportG() {   //  remove some styles  before export graph
        let links = this.paperView.graph.getCells()
        for (var i = links.length - 1; i >= 0; i--) {
            if (links[i].attributes.type == "org.Arrow") {
                links[i].attr({
                    '.marker-arrowheads': { fill: 'none' },
                    '.connection': { fill: 'none' },
                    '.connection-wrap': { fill: 'none' },
                    '.marker-vertices': { fill: 'none' },
                    '.link-tools': { fill: 'none' }
                });
            }
        }
        this.exportAndDownload();
    }

    //export  graph
    async exportAndDownload() {
        var svg: any = this.paperView.paper.svg;
        var data: any = (new XMLSerializer()).serializeToString(svg);
        let paperCurrentSizeW = this.paperView.paperElement.nativeElement.offsetWidth;
        let paperCurrentSizeH = this.paperView.paperElement.nativeElement.offsetHeight;
        const canvas: any = new OffscreenCanvas(paperCurrentSizeW, paperCurrentSizeH);
        const ctx: any = canvas.getContext('2d');
        const v: any = await Canvg.from(ctx, data, presets.offscreen());
        await v.render();
        var img: any = new Image();
        const blob: any = await canvas.convertToBlob({ type: 'image/png', quality: 1 });
        const pngUrl: any = URL.createObjectURL(blob);
        var DOMURL: any = window.URL || window.webkitURL || window;

        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            DOMURL.revokeObjectURL(pngUrl);
            saveAs(blob, "ExportPng.png");
        };
        img.src = pngUrl;
    }

    drawSheetFunctionalRels() { // functional relationships only store on tree, they are draw on every load  
        this.treeOrg.treeModel.doForAll((item) => {
            if (item.data.isfunctionalrel) {
                if (item.data.functionalRelSourceName && item.data.functionalRelTargetName) {
                    this.paperView.addFunctionalRel(item.data.functionalRelSourceName, item.data.functionalRelTargetName)
                }
            }
        })
    }

    loadSheet(sheet: any) { // load sheet 
        this.sheetSelected = sheet;
        this.isSheetNodesTempView = false;
        this.getActiveSheetShapesDefaults();
        if (this.sheetSelected.Data != "") {
            let cells = JSON.parse(this.sheetSelected.Data);
            this.paperView.graph.fromJSON(cells)
            setTimeout(() => {
                if (cells.cells && cells.cells.length > 0) {
                    this.drawSheetFunctionalRels();
                    this.paperView.updateSupervisedCounters();
                    this.paperView.adjustGraphContent();
                }
            }, 300)
        } else {
           this.paperView.graph.fromJSON({
                cells: []
            })
        }

        if (this.sheetSelected.Attrs != "") { // set jointjs  paper(sheet)  dimentions on sheet load
            let dim = JSON.parse(this.sheetSelected.Attrs);
            if (dim.w && dim.h) {

                this.paperView.paper.setDimensions(dim.w, dim.h);
            }
        } else {
            this.sheetSelected.Attrs = JSON.stringify({ w: 1000, h: 800 });
        }

        return;
    }

    addSheetToViewByName(sheetName: any) {
        this.projectSheets.forEach((sheet) => {
            if (sheet.SheetName == sheetName) {
                this.addSheetToView(sheet);
                return;
            }
        })
    }

    addSheetToView(sheet: any) {
        if (!this.activeSheets[sheet.ID]) {
            this.sheets.push(sheet);
            this.activeSheets[sheet.ID] = true;
            this.activeId = sheet.ID;
            this.loadSheet(sheet);
        } else {
            this.activeId = sheet.ID;
            this.loadSheet(sheet);
        }
    }

    removeSheetFromView(sheet: Sheet) {
        let tempSheets: Sheet[] = this.sheets;
        let i = tempSheets.length;
        this.sheets = [];
        this.activeSheets[sheet.ID] = false;
        tempSheets.forEach((sheetI) => {
            i = i - 1;
            if (sheetI.ID != sheet.ID) {
                this.sheets.push(sheetI);
            }
            if (i <= 0) {
                if (this.sheets.length > 0) {
                    this.activeId = this.sheets[0].ID;
                    this.loadSheet(this.sheets[0]);
                } else {
                    this.clearSheetSelected();
                }
            }
        })
        return;
    }

    clearSheetSelected() {
        this.paperView.graph.fromJSON({
            cells: []
        })
        this.sheetSelected = new Sheet;
        return;
    }

    openAddNodeModal(event, inputFormTemplate) {  // open add node  modal 
        this.newNodeName = "";
        this.newNodeCode = "";
        if (!this.sheetSelected.ID) {
            alert("No Sheet Selected!");
            return;
        }
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }


    openReporsWindow(event, inputFormTemplate) {  // open reports modal 
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }

    openSheetForm(event, inputFormTemplate, sheet: Sheet) {  // open sheet form modal
        if (!this.projectSelected.ID) {
            alert("No project Selected!");
            return;
        }
        this.sheetToEdit = new Sheet;
        if (sheet) {
            this.sheetToEdit = sheet;
        } else {
            this.sheetToEdit.ProjectID = this.projectSelected.ID;
        }
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });
    }

    openSheetFormEdit(event, inputFormTemplate, sheet: Sheet) { // open sheet edit form modal
        if (!this.projectSelected.ID) {
            alert("No project Selected!");
            return;
        }
        if (!sheet.ID) {
            alert("No sheet Selected!");
            return;
        }

        this.sheetToEdit = new Sheet;
        if (sheet) {
            this.sheetToEdit = sheet;
        } else {
            this.sheetToEdit.ProjectID = this.projectSelected.ID;
        }
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });
    }

    openSheetSearch(event, searchSheetTemplate) {
        if (this.projectSelected && this.projectSheets && this.projectSheets.length > 0) {
            event.preventDefault();
            this.modalWindow = this.modalService.open(searchSheetTemplate, {
                ariaLabelledBy: 'modal-basic-title',
                size: 'md',
                scrollable: false
            });
        }
    }


    openProjectForm(event, inputFormTemplate, project: Project) {
        this.projectToEdit = new Project;
        if (project) {
            Object.assign(this.projectToEdit, project);
        }
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }
    
    openContactForm(event, inputFormTemplate, contact: Contact) {
        this.contactToEdit = new Contact;
        if (contact) {
            Object.assign(this.contactToEdit, contact);
        }
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }

    refreshSelectedSheetAfterDelete(sheet: Sheet) { //refresh selected sheet after tree deleting  
        this.positionCurrent = new Position;
        if (!this.sheetSelected.ID) {
            return
        }
        this.loadSheet(this.sheetSelected);
    }


    refreshSelectedSheetCB(sheet: any, cb: any) {
        this.isSheetNodesTempView = false;
        this.http.get < any > (urlApi + '/sheet/' + sheet.ID)
            .subscribe(
                (any) => {
                    if (any) {
                        this.sheetSelected = any[0];
                        cb(this.sheetSelected)
                    }
                },
                err => {
                    if (err.error && err.error.message) {
                        console.log(err.error.message);
                        cb(null)
                    }
                    return;
                }
            );
    }

    refreshSelectedSheet(sheet: any) {  // refresh active sheet
        this.isSheetNodesTempView = false;
        this.http.get < any > (urlApi + '/sheet/' + sheet.ID)
            .subscribe(
                (any) => {
                    if (any) {
                        this.sheetSelected = any[0];
                        this.loadSheet(this.sheetSelected);
                    }
                },
                err => {
                    if (err.error && err.error.message) {
                        alert(err.error.message);
                    }
                    return;
                }
            );
    }

    saveOffviewSheet(sheet: any) { // on tree change this function is called to save sheet sync 
        if (sheet.ID) { //
            this.http.put < any > (urlApi + '/sheet/' + sheet.ID, sheet)
                .subscribe(
                    (any) => {
                        if (any) {}
                    },
                    err => {
                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        }
    }


    saveSheet(sheet: any, isNameUpdate?: boolean) {  // save sheet on db
        if (sheet.ID) { //if exists
            if (!sheet.SheetName||sheet.SheetName==""){
                alert("Sheet name is required!");
                return;
            }
            let querystring="";
            if (isNameUpdate){
                querystring="?isn=yes"
            }
            sheet.Data = JSON.stringify(this.paperView.graph.toJSON());
            this.http.put < any > (urlApi + '/sheet/' + sheet.ID+querystring, sheet)
                .subscribe(
                    (any) => {
                        if (any) {
                                this.refreshSelectedSheetCB(sheet, (sh)=>{
                                    this.sheets.forEach((s)=>{
                                        if(s.ID==sh.ID){
                                            s.SheetName=sh.SheetName;

                                        }  
                                    })
                                }) 
                        }
                    },
                    err => {
                        if (err && err.error) {
                            if (String(err.error.error).match('UNIQUE constraint failed')) {
                                alert("Sheet name exists!");
                                this.refreshSelectedSheetCB(sheet, (sh)=>{
                                            sheet.SheetName=sh.SheetName;
                              
                                }) 

                            }
                        }

                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        } else {
            if (!sheet.SheetName||sheet.SheetName==""){
                alert("Sheet name is required!");
                return;
            }

            this.http.post < any > (urlApi + '/sheet', sheet)
                .subscribe(
                    (any) => {
                        if (any) {
                            this.getSheets(this.projectSelected);
                            setTimeout(() => {
                                this.addSheetToViewByName(sheet.SheetName);
                            }, 1000);

                        }
                    },
                    err => {
                        if (err && err.error) {
                            if (String(err.error.error).match('UNIQUE constraint failed')) {
                                alert("Sheet name exists!");
                            }
                        }
                        return;
                    }
                );

        }

    }

    saveProject(project: any, isNameUpdate?: boolean) {  // save  project on db
        if (project.ID) { //if exists
            if (!project.ProjectName||project.ProjectName==""){
                alert("Project name is required!");
                return;
            }
            let querystring="";
            if (isNameUpdate){
                querystring="?isn=yes"
            }
            this.http.put < any > (urlApi + '/project/' + project.ID+querystring, project)
                .subscribe(
                    (any) => {
                        if (any) {
                            alert("Project Updated!");
                            this.getProjects();
                            return;
                        }
                    },
                    err => {
                        if (err && err.error) {
                            if (String(err.error.error).match('UNIQUE constraint failed')) {
                                alert("Project name exists!");
                            }
                        }

                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        } else {
            if (!project.ProjectName||project.ProjectName==""){
                alert("Project name is required!");
                return;
            }

            this.http.post < any > (urlApi + '/project', project)
                .subscribe(
                    (any) => {
                        if (any) {
                            this.getProjects();
                            return
                        }
                    },
                    err => {
                        if (err && err.error) {
                            if (String(err.error.error).match('UNIQUE constraint failed')) {
                                alert("Project name exists!");
                            }
                        }

                        return;
                    }
                );

        }

    }


    saveContact(contact: any, isNameUpdate?: boolean) {  // save  project on db
        if (contact.ID) { //if exists
            if (!contact.Name||contact.Name==""){
                alert("Contact name is required!");
                return;
            }
            let querystring="";
            if (isNameUpdate){
                querystring="?isn=yes"
            }
            this.http.put < any > (urlApi + '/contact/' + contact.ID+querystring, contact)
                .subscribe(
                    (any) => {
                        if (any) {
                            alert("Contact Updated!");
                            this.getContacts();
                            return;
                        }
                    },
                    err => {
                        if (err && err.error) {
                            if (String(err.error.error).match('UNIQUE constraint failed')) {
                                alert("Contact name exists!");
                            }
                        }

                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        } else {
            if (!contact.Name||contact.Name==""){
                alert("Project name is required!");
                return;
            }

            this.http.post < any > (urlApi + '/contact', contact)
                .subscribe(
                    (any) => {
                        if (any) {
                            this.getContacts();
                            return
                        }
                    },
                    err => {
                        if (err && err.error) {
                            if (String(err.error.error).match('UNIQUE constraint failed')) {
                                alert("Contact name exists!");
                            }
                        }

                        return;
                    }
                );

        }

    }

    confirmDeleteProject(popover) {
        if (popover.isOpen()) {
            popover.close();
        } else {
            popover.open();
        }
        return
    }

    deleteProject(project: Project) { // delete project from db
        if (project.ID != 0) {
            this.http.delete < any > (urlApi + '/project/' + project.ID)
                .subscribe(
                    (any) => {
                        if (any) {
                            this.getProjects();
                            this.sheets = [];
                            this.projectSelected = new Project;
                            this.projectSelected.ProjectName = "Project"
                            this.sheetSelected = new Sheet;
                            this.sheetSelected.SheetName = "Sheet"
                            this.clearSheetSelected()
                            this.isSheetNodesTempView = false;
                            this.projectSheets = [];
                            this.nodes = [];
                            this.positionCurrent = new Position;
                        }
                    },
                    err => {
                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        }
    }
    deleteContact(contact: Contact) { // delete project from db
        if (contact.ID != 0) {
            this.http.delete < any > (urlApi + '/contact/' + contact.ID)
                .subscribe(
                    (any) => {
                     console.log(any)
                     this.getContacts();
                    },
                    err => {
                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        }
    }

    addRootNode() {  // add graph root node 
        if (!this.sheetSelected.ID) {
            alert('No sheet selected!')
            return;
        }
        if ((this.paperView.graph.getElements()).length <= 0) {
            this.paperView.addGraphNode(null, 1, 1, 'Root', '', 'position')
        }
    }

    exportElements: any = ""
    exportTreeNodesRecur(activeNode: any, treePos: any) {
        this.exportElements = this.exportElements + treePos + ":" + activeNode.data.name + ";"
        treePos = treePos + 1
        if (activeNode.children.length > 0) {
            activeNode.children.forEach((child) => {
                this.exportTreeNodesRecur(child, treePos)
            })
        }
    }
    exportTreeNodes(tree: any) {  //Export  tree nodes
        this.tree = tree;
        this.exportElements = "";
        if (!tree.treeModel.getActiveNode() && tree.treeModel.nodes.length > 0) {
            alert('No active or selected Node!')
            return;
        }
        let activeNode = tree.treeModel.getActiveNode();
        this.exportTreeNodesRecur(activeNode, 0);
        setTimeout(() => {
            let fileName: any = this.projectSelected.ProjectName + "-" + activeNode.data.name
            window.open(urlApi + "/export-tree?n=" + encodeURIComponent(fileName) + "&d=" + encodeURIComponent(this.exportElements), '_blank');
        }, 500)

    }


    clearGraphAndSheet(){
        if (!this.sheetSelected.ID) {
            return;
        }
        this.paperView.clear()
        setTimeout(()=>{this.saveSheet(this.sheetSelected)},1000) 
    }

    generateGraph(tree: any) { // generate sheet graph  from tree first node, after it will be called recursive generateGraphRecur
        this.tree = tree;
        if (!this.sheetSelected.ID) {
            alert('No sheet selected!');
            return;
        }
        if (!tree.treeModel.getActiveNode() && tree.treeModel.nodes.length > 0) {
            alert('No active or selected Node!');
            return;
        }
        let activeNode = tree.treeModel.getActiveNode();
        // find current tree node if exists on graph
        let baseRoot = _.find(this.paperView.graph.getElements(), (item) => { return item.attributes.tree_id ==  activeNode.data.id })
        setTimeout(()=>{this.paperView.adjustGraphContent()},800) 
        setTimeout(()=>{this.saveSheet(this.sheetSelected)},1000) 
        


        if (this.paperView.graph.getElements().length<=0){ // if sheet empty
                let newCell = this.paperView.memberDef(null,
                    350,
                    50,
                    activeNode.data.name.replace('(a) ',''), activeNode.data.name.replace('(a) ',''), 'male.png', '#ffffff', '#797979', false);
                newCell.attributes.tree_id = activeNode.data.id;
                this.paperView.graph.addCell(newCell);
                this.generateGraphRecur(activeNode, newCell);
        }else{
            if(baseRoot){  // only generate/update when tree node exists on sheet
             //   console.log(baseRoot);
                this.generateGraphRecur(activeNode, baseRoot);
            } 
        }

    }


   

    generateGraphRecur(activeNode: any, parentNew: any) { // generate sheet graph recursive from tree

        let positionType = 'position'
        if (activeNode.children.length > 0) {
            let unitX = -1;
            activeNode.children.forEach((child) => {
                if (child.data.isfunctionalrel == true) {} else {

                    let graphNode = _.find(this.paperView.graph.getElements(), (item) => { return item.attributes.tree_id ==  child.data.id })

                    if (graphNode){
                       // this.generateGraphRecur(child, graphNode)

                    }else{


                        let newCell = this.paperView.memberDef(parentNew.attributes,
                            parentNew.attributes.position.x + (200 * unitX),
                            parentNew.attributes.position.y + (130),
                            child.data.name.replace('(a) ',''), child.data.name.replace('(a) ',''), 'male.png', '#ffffff', '#797979', false)
                        
                            newCell.attributes.is_advisor=false;
                        if (child.data.position.AdvisingAuthority){
                            newCell.attributes.is_advisor=true;
                        }

                        let newLink = this.paperView.getLinkDef(parentNew, newCell);

                        newCell.attributes.tree_id = child.data.id
                        this.paperView.graph.addCell(newCell);

                        
                        this.paperView.graph.addCell(newLink);

                        unitX = unitX + 1;

                        //this.generateGraphRecur(child, newCell)

                    }
                }
            })
        }
    }


    openAddTreeNodeTemplate(event, inputFormTemplate, tree: any) {  //  open modal for tree node
        this.tree = tree;
        this.nodeName = "";
        if (!this.projectSelected.ID) {
            alert('No project selected!')
            return;
        }
        if (!tree.treeModel.getActiveNode() && tree.treeModel.nodes.length > 0) {
            alert('No active or selected Node!')
            return;
        }
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }


    onUpdateTree($event, tree) { // save project when tree is updated
        if (!this.projectSelected.ID) {
            return;
        }
        let allData = {
            nodes: tree.treeModel.nodes,
            positions: this.positions
        }
        this.projectSelected.Data = JSON.stringify(allData);
        if (!this.isProjectFisrtTreeUpdate) {
            //update project tree
            this.http.put < any > (urlApi + '/project/' + this.projectSelected.ID, this.projectSelected)
                .subscribe(
                    (any) => {
                        if (any) {
                            return;
                        }
                    },
                    err => {
                        if (err.error && err.error.message) {
                            alert(err.error.message);
                        }
                        return;
                    }
                );
        }
        this.isProjectFisrtTreeUpdate = false;
        return;

    }

    onNodeFocus($event, tree) { // set data when tree node is focused
        let nodeCurrent = tree.treeModel.getFocusedNode();
        if ((nodeCurrent.data.is_displacement && nodeCurrent.data.is_displacement == true) ||
            (nodeCurrent.data.isfunctionalrel && nodeCurrent.data.isfunctionalrel == true)) {
            this.positionCurrent = new Position;
        } else {
            this.positionCurrent = nodeCurrent.data.position;
            this.positionCurrent.ID = nodeCurrent.data.id;
        }
        this.treeNodeCurrent = nodeCurrent;

        if (!this.treeNodeCurrent.data.privacy) {
            this.treeNodeCurrent.data.privacy = {
                enableAditional: false,
                enableException: false,
                contactsAditional: [],
                contactsException: []
            }
        }
        if (!this.treeNodeCurrent.data.attachments) {
            this.treeNodeCurrent.data.attachments = [];

        }
        if (!this.treeNodeCurrent.data.functionalrels) {
            this.treeNodeCurrent.data.functionalrels = [];
        }

        if (!this.treeNodeCurrent.data.employees_position) {
            this.treeNodeCurrent.data.employees_position = [];
        }


        return;
    }


    saveNamePosition(position: any, tree: any) { // when position name change in details update name on graph
        var treeNode = this.treeOrg.treeModel.getNodeBy((nodeIn) => nodeIn.data.id == position.ID);
        treeNode.data.name = position.PositionName.replace('(a) ','');
        if(position.AdvisingAuthority){
            treeNode.data.name='(a) '+position.PositionName
        }

        _.each(this.paperView.graph.getElements(), (item) => {
            if (item.attributes.tree_id == position.ID) {
                item.attr('.rank/text', position.PositionName);
            }
        })
        this.savePosition(position, tree)
    }

    changeAdvisingAuthorityPosition(position: any, tree: any) { // when position Is Advisor? change in details update on graph
        var treeNode = this.treeOrg.treeModel.getNodeBy((nodeIn) => nodeIn.data.id == position.ID);
        treeNode.data.name = position.PositionName.replace('(a) ','');
        if(position.AdvisingAuthority){
            treeNode.data.name='(a) '+position.PositionName
        }

        _.each(this.paperView.graph.getElements(), (item) => {
            if (item.attributes.tree_id == position.ID) {
                item.attr('.rank/text', position.PositionName);
                // change link in location
                var inboundLink = this.paperView.graph.getConnectedLinks(item, {
                    inbound: true
                });
                if(position.AdvisingAuthority){
                   if (inboundLink&&inboundLink[0]){
                        inboundLink[0].router({
                            name: 'manhattan',
                            args: {
                                padding: 10,
                                startDirections: ['bottom'],
                                endDirections: ['right', 'left']
                            }
                        });
                   }    
                  item.attr('is_advisor', true);
  
                }else{
                   if (inboundLink&&inboundLink[0]){
                       inboundLink[0].router({
                            name: 'manhattan',
                            args: {
                                padding: 10,
                                startDirections: ['bottom'],
                                endDirections:  ['top']
                            }
                        });
                   }  
                     item.attr('is_advisor', false);
                }
            }
        })
        this.savePosition(position, tree)
    }

    savePositionDisplacement(position: any, tree: any) {  // save displacements 
        let node = this.treeOrg.treeModel.getNodeById(position.ID);
        if (position.SpacesToSupervisor > node.data.displacement_num) {
            node.setIsActive(true);
            this.addNodeDisplacement(this.treeOrg);
        }
        if (position.SpacesToSupervisor < node.data.displacement_num) {
            let displacementNode = this.treeOrg.treeModel.getNodeBy((item) => { return item.data.displaced_node_id == node.data.id });
            if (displacementNode) {
                displacementNode.setIsActive(true);
                this.removeNodeDisplacement(this.treeOrg);
            }
        }

        this.savePosition(position, tree);
    }

    savePosition(position: any, tree: any) {  // save position (node)
        let treeNodeCurrent = this.treeOrg.treeModel.getNodeById(position.ID)
        treeNodeCurrent.data.position = this.positionCurrent;
        let allData = {
            nodes: this.nodes,
            positions: {}
        }
        this.projectSelected.Data = JSON.stringify(allData);
        //reloasd data
        allData = {
            nodes: [],
            positions: {}
        }
        if (this.projectSelected.Data != "") {
            allData = JSON.parse(this.projectSelected.Data);
        }
        this.nodes = []
        if (allData && allData.nodes) {
            this.nodes = allData.nodes;
        }

        //reload data end


        //update project tree
        this.http.put < any > (urlApi + '/project/' + this.projectSelected.ID, this.projectSelected)
            .subscribe(
                (any) => {
                    if (any) {

                        return;
                    }
                },
                err => {
                    if (err.error && err.error.message) {
                        alert(err.error.message);
                    }
                    return;
                }
            );
        return;
    }

    saveConfig(key: any, value: any) {  // save config values
        this.http.post < any > (urlApi + '/config/' + key, {
                key: key,
                value: value
            })
            .subscribe(
                (any) => {
                    if (any) {}
                },
                err => {
                    if (err.error && err.error.message) {
                        alert(err.error.message);
                    }
                    return;
                }
            );
    }

    refreshProjectSelectedSheets(cb) { // refresh selected project  sheets
        let i = 0;
        let newProjectSheets: any = [];
        if (this.sheetSelected && this.projectSheets.length > 0) {
            this.projectSheets.forEach((sheet) => {
                if (this.sheetSelected && (sheet.ID == this.sheetSelected.ID)) {
                    newProjectSheets.push(this.sheetSelected);
                } else {
                    newProjectSheets.push(sheet)
                }
                if (i >= this.projectSheets.length - 1) {
                    cb(newProjectSheets)
                }
                i = i + 1;
            })
        }
    }


    nodeToDeleteData: any = {}
    checkBeforeDeleteTreeNode(tree: any, cb) {  // check before delete node
        if (!tree.treeModel.getActiveNode()) {
            return;
        }
        let node = tree.treeModel.getActiveNode();
        this.nodeToDeleteData.node = node;
        this.refreshProjectSelectedSheets((projectSheets) => {
            this.paperView.beforeDeleteNodeAllSheets(node, projectSheets);
        })
        cb()
    }

    openConfirmDeleteTreeNode(event: any, confirmDeleteTreeNodeTemplate: any, tree: any) { // modal confirm delete node
        if (!tree.treeModel.getActiveNode()) {
            return;
        }
        event.preventDefault();
        this.tree = tree;
        this.checkBeforeDeleteTreeNode(tree, () => {
            this.modalWindow = this.modalService.open(confirmDeleteTreeNodeTemplate, {
                ariaLabelledBy: 'modal-basic-title',
                size: 'sm',
                scrollable: false
            });

        });

    }

    confirmDeleteAnyMsg:any="";
    // modal confirm delete any, confirmDeleteAnyMsg:message to show, fnToDelete:function to call, argToDelete:args to function
    openConfirmDeleteAny(event: any, confirmDeleteTreeNodeTemplate: any, confirmDeleteAnyMsg: any,fnToDelete:any,argToDelete:any) {
        this.fnToDelete=fnToDelete;
        this.argToDelete=argToDelete;
        this.confirmDeleteAnyMsg=confirmDeleteAnyMsg;
        event.preventDefault();
        this.modalWindow = this.modalService.open(confirmDeleteTreeNodeTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'sm',
            scrollable: false
        });

    }

    fnToDelete:any;
    argToDelete:any;
    deleteAny(){
        if(this.argToDelete){
              this.fnToDelete.call(this,this.argToDelete);
        }else{
             this.fnToDelete.call(this);
        }
    }


    delFunctionalRelsOtherNodes(tree: any, node: any) { // ex. del 's5' tree node, find all s5 functional rels on other nodes 
        tree.treeModel.doForAll((n) => {
            if (n.functionalrels) {
                _.remove(n.functionalrels, (item: any) => {
                    return item.functionalRelSourceId === node.id
                })
            }
        })
        return
    }

    deleteNode(tree) {  // delete tree node 
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        this.positionCurrent= new Position;
        let node = tree.treeModel.getActiveNode();
        if (node.data.isfunctionalrel && node.data.isfunctionalrel == true) {
            this.deleteFunctionalRelById({
                id: node.data.functionalRelTargetId,
                idSource: node.data.functionalRelSourceId
            }, tree)
        }
        this.delFunctionalRelsOtherNodes(tree, node);

        let parentNode = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        _.remove(parentNode.data.children, (child: any) => {
            return child === node.data;
        });
        //new, delete node on all sheets 
        this.refreshProjectSelectedSheets((projectSheets) => {
            this.paperView.deleteNodeAllSheets(node, projectSheets);
        })
        tree.treeModel.update();
        this.onUpdateTree(null, tree);

    }

    checkAndUpdateTreeNodeAddedAllSheets(parent: any, newNodeName: any) { //executed only when node is not root 
        this.projectSheets.forEach((sheet) => {
            if (sheet.Data != "") {

                let cells = JSON.parse(sheet.Data);
                cells.cells.forEach((cell) => {
                    if (cell.type != "org.Arrow") {
                        if (cell.attrs[".rank"].text == parent.data.name) {
                            let newCell = this.paperView.memberDef(cell,
                                cell.position.x + (200),
                                cell.position.y + (130),
                                newNodeName, newNodeName, 'male.png', '#ffffff', '#797979', false)
                            cells.cells.push(newCell.attributes);
                            let newLink = this.paperView.getLinkDef(cell, newCell);
                            cells.cells.push(newLink.attributes);

                            sheet.Data = JSON.stringify(cells);
                            this.saveOffviewSheet(sheet);
                            this.refreshSheetOnView();
                        }
                    }
                })
            }
        })
    }

    addNode(tree: any, nodeName: any, nodePositionCode: any) {  // add tree node
        if (nodeName == undefined || nodeName == '') {
            alert("Node Name can't be empty");
            return;
        }
        let nodePosition: Position = new Position;
        let parent: any;
        nodePosition.PositionName = nodeName;
        nodePosition.PositionCode = nodePositionCode;
        nodePosition.DedicationRegime = 'position';
        if (tree.treeModel.nodes.length > 0) {
            parent = tree.treeModel.getActiveNode();

            nodePosition.PositionInmediateSuperior = parent.data.name;
            parent.data.children.push({
                name: nodeName,
                position: nodePosition,
                children: []
            });


            setTimeout(() => {
                let parentRefresh = tree.treeModel.getNodeById(parent.id);
                parentRefresh.getLastChild().setActiveAndVisible();
            }, 600)

        } else { //is root
            tree.treeModel.nodes.push({
                name: nodeName,
                position: nodePosition,
                children: []
            })
        }

        tree.treeModel.update();
        this.onUpdateTree(null, tree);
    }

    treeNodeSameLevelUp(tree: any) {  
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        let node: any = tree.treeModel.getActiveNode();
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }
        let parentNode: any = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        let previousSibling: any = node.findPreviousSibling()
        if (!previousSibling) {
            alert('No previous Sibling available!');
            return;
        }
        tree.treeModel.moveNode(node, {
            dropOnNode: false,
            index: previousSibling.index,
            parent: parentNode
        }, {
            index: 0,
            parent: parentNode
        })
    }
    treeNodeSameLevelDown(tree: any) {
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        let node: any = tree.treeModel.getActiveNode();
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }
        let parentNode: any = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        let nextSibling: any = node.findNextSibling()
        if (!nextSibling) {
            alert('No next Sibling available!');
            return;
        }
        tree.treeModel.moveNode(nextSibling, {
            dropOnNode: false,
            index: node.index,
            parent: parentNode
        }, {
            index: 0,
            parent: parentNode
        })
    }


    treeNodeOneLevelDown(tree: any) {
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        let node: any = tree.treeModel.getActiveNode();
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }

        let parentNode: any = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        let previousSibling: any = node.findPreviousSibling()
        if (!previousSibling) {
            alert('No previous Sibling available!')
            return;
        }
        tree.treeModel.moveNode(node, {
            dropOnNode: false,
            index: 0,
            parent: previousSibling
        }, {
            index: 0,
            parent: parentNode
        })
        setTimeout(() => {
            (tree.treeModel.getNodeById(previousSibling.id)).expand()
        }, 300)
    }


    treeNodeOneLevelUp(tree: any) {
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        let node: any = tree.treeModel.getActiveNode();
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }
        let parentNode: any = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        if (parentNode.isRoot == true) {
            alert("No allowed to move at root level");
            return;
        }
        let grandParentNode: any = parentNode.realParent ? parentNode.realParent : parentNode.treeModel.virtualRoot;

        tree.treeModel.moveNode(node, {
            dropOnNode: false,
            index: parentNode.index,
            parent: grandParentNode
        }, {
            index: 0,
            parent: parentNode
        })

    }


    // uuid like for displacements
    S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    getGuid() {
        return (this.S4() + this.S4() + "-" + this.S4() + "-4" + this.S4().substr(0, 3) + "-" + this.S4() + "-" + this.S4() + this.S4() + this.S4()).toLowerCase();
    }


    // displacement
    createNodeDisplacement(tree: any, parentNode: any, displacementId: any, index: any, node: any, cb) {

        let nodePosition: Position = new Position;
        nodePosition.PositionName = '**Displacement**';
        nodePosition.PositionCode = ""
        parentNode.data.children.splice(index, 0, {
            name: '**Displacement**',
            position: nodePosition,
            children: [],
            displaced_node_id: node.data.id,
            is_displacement: true,
            displacement_id: displacementId
        });

        tree.treeModel.update();
        setTimeout(() => {
            cb()
        }, 300)
    }

    addNodeDisplacement(tree: any) {
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        let node: any = tree.treeModel.getActiveNode();
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }
        let parentNode: any = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        // let  displacementId:any = "d-"+(parentNode.id).toString() + (parentNode.data.children.length+1).toString();     
        let displacementId: any = "d-" + this.getGuid();

        this.createNodeDisplacement(tree, parentNode, displacementId, node.index, node, () => {
            let displacementNode: any;
            node = tree.treeModel.getNodeById(node.id);
            if (!node.data.displacement_num) {
                node.data.displacement_num = 0;
            }
            node.data.displacement_num = node.data.displacement_num + 1;
            node.data.position.SpacesToSupervisor = node.data.displacement_num;

            parentNode = tree.treeModel.getNodeById(parentNode.id);
            displacementNode = tree.treeModel.getNodeBy((nodeIn) => nodeIn.data.displacement_id == displacementId);

            // set no under displacement  
            tree.treeModel.moveNode(node, {
                dropOnNode: false,
                index: 0,
                parent: displacementNode
            }, {
                index: 0,
                parent: parentNode
            })
            tree.treeModel.update();
            setTimeout(() => {
                (tree.treeModel.getNodeById(displacementNode.id)).expand()
            }, 300)
            this.onUpdateTree(null, tree);
        })

    }

    removeNodeDisplacement(tree: any) {  // delete displacement node
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        let node: any = tree.treeModel.getActiveNode();
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }
        if (node.data.name != '**Displacement**') {
            alert("Not a Displacement node");
            return;
        }

        let parentNode: any = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        let i = node.index
        let c = 0
        node.data.children.forEach((child) => {
            child = tree.treeModel.getNodeById(child.id);
            parentNode = tree.treeModel.getNodeById(parentNode.id);
            if (child.data.displacement_num) {
                child.data.displacement_num = child.data.displacement_num - 1;
                child.data.position.SpacesToSupervisor = child.data.displacement_num;

                if (child.data.displacement_num < 0) { child.data.displacement_num = 0 };
            }

            tree.treeModel.moveNode(child, {
                dropOnNode: false,
                index: i,
                parent: parentNode
            }, {
                index: 0,
                parent: parentNode
            })
            tree.treeModel.update();
            if (c >= node.data.children.length - 1) {
                node = tree.treeModel.getNodeById(node.id);
                node.setActiveAndVisible();
                this.deleteNode(tree);
            }

            i = i + 1
            c = c + 1
        })
    }



    addNodeSibling(tree: any, nodeName: any, nodePositionCode: any) {  // add  tree node sibling
        if (nodeName == undefined || nodeName == '') {
            alert("Node Name  can't be empty");
            return;
        }
        let nodePosition: Position = new Position;
        nodePosition.PositionName = nodeName;
        nodePosition.PositionCode = nodePositionCode;
        nodePosition.DedicationRegime='position';


        if (tree.treeModel.nodes.length > 0) {
            let selectedNode = tree.treeModel.getActiveNode();
            let parent: any;

            if (selectedNode.isRoot == true) {
                alert("sibling no allowed at root level");
                return;
            }
            parent = selectedNode.parent;

            nodePosition.PositionInmediateSuperior = parent.data.name;
            parent.data.children.push({
                name: nodeName,
                position: nodePosition,
                children: []
            });

            setTimeout(() => {
                (tree.treeModel.getNodeBy((node) => node.data.name == nodeName)).setActiveAndVisible()
            }, 300)

        } else { //is root
            alert("sibling no allowed at root level");
            return;
        }

        tree.treeModel.update();
        this.onUpdateTree(null, tree);

    }



    treeLevelFilter: any;
    setTreeLevelFilter(tree: any, value: any) {
        if (value < 0) {
            this.treeLevelFilter = 0;
            return
        }
        tree.treeModel.collapseAll();
        let root = tree.treeModel.getFirstRoot()
        this.setTreeLevelFilterRecur(tree, root, 0)
    }
    setTreeLevelFilterRecur(tree: any, node: any, i: any) {
        if (i < this.treeLevelFilter) {
            tree.treeModel.doForAll((n) => {
                if (n.id == node.id) {
                    node.expand()
                }
            }) // node.expand() alone dosnt work !!??
            if (node.children.length > 0) {
                node.children.forEach((child) => {
                    this.setTreeLevelFilterRecur(tree, child, i + 1)
                })
            }
        }
    }

    activeNode(tree: any) {
        if (tree.treeModel.nodes.length <= 0) { //is root
            return "Root Node";
        }

        let parent: any = ""
        parent = tree.treeModel.getActiveNode();
        if (!parent) {
            return;
        }
        return parent.data.name;
    }

    search = (text$: Observable < string > ) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(term => term.length < 2 ? [] :
                positionsName.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
        )
    //Sheet

    //search contacts exampls, aditional , exceptions
    contacts: Contact[] = []

    searchContacts = (text$: Observable < string > ) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(term => term.length < 1 ? [] :
                //        this.contacts.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
                this.contacts.filter(v => v.Name.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
        )
    formatter = (x: {
        Name: string
    }) => x.Name;
    contactsAditional: any = []
    contactsException: any = []
    contactsAditionalHash: any = {} 
    contactsExceptionHash: any = {} 


    deleteAditionalShape(item: any, tree) { 
        _.remove(this.paperView.shapeProperties.privacy.contactsAditional, (contact) => {
            return contact === item;
        });

    }
    deleteExceptionShape(item: any, tree) { 
        _.remove(this.paperView.shapeProperties.privacy.contactsException, (contact) => {
            return contact === item;
        });

    }
    updateAditionalShape(item: any) { 
        _.each(this.paperView.shapeProperties.privacy.contactsAditional, (contact) => {
            if (contact === item) {
                contact.see = item.see;
                contact.modify = item.modify;
                contact.delete = item.delete;
            }
        });
    }

    updateExceptionShape(item: any) { 
        _.each(this.paperView.shapeProperties.privacy.contactsException, (contact) => {
            if (contact === item) {
                contact.see = item.see;
                contact.modify = item.modify;
                contact.delete = item.delete;
            }
        });
    }


    addAditionalShape(event: any) {
        let contactsSelected = event;
        contactsSelected.forEach((item, i) => {
            this.contactsAditionalHash[item.name] = true 
            this.paperView.shapeProperties.privacy.contactsAditional.push({
                name: item.name,
                see: false,
                modify: false,
                delete: false
            });
        });
    }


    addExceptionShape(event: any) {
        let contactsSelected = event;
        contactsSelected.forEach((item, i) => {
            this.contactsExceptionHash[item.name] = true 
            this.paperView.shapeProperties.privacy.contactsException.push({
                name: item.name,
                see: false,
                modify: false,
                delete: false
            });
        });
    }



    ////
    addAditionalPosition(event: any) {
        let contactsSelected = event;
        contactsSelected.forEach((item, i) => {
            this.contactsAditionalHash[item.name] = true 
            this.treeNodeCurrent.data.privacy.contactsAditional.push({
                name: item.name,
                see: false,
                modify: false,
                delete: false
            });
            if (i >= contactsSelected.length - 1) {
                this.savePosition(this.positionCurrent, this.treeOrg);
            }
        });
    }


    addExceptionPosition(event: any) {
        let contactsSelected = event;
        contactsSelected.forEach((item, i) => {
            this.contactsExceptionHash[item.name] = true 
            this.treeNodeCurrent.data.privacy.contactsException.push({
                name: item.name,
                see: false,
                modify: false,
                delete: false
            });
            if (i >= contactsSelected.length - 1) {
                this.savePosition(this.positionCurrent, this.treeOrg);
            }
        });
    }

    deleteAditionalPosition(item: any, tree) { 
        _.remove(this.treeNodeCurrent.data.privacy.contactsAditional, (contact) => {
            return contact === item;
        });
        this.savePosition(this.positionCurrent, tree);

    }
    deleteExceptionPosition(item: any, tree) { 
        _.remove(this.treeNodeCurrent.data.privacy.contactsException, (contact) => {
            return contact === item;
        });
        this.savePosition(this.positionCurrent, tree);

    }
    updateAditionalPosition(item: any) { 
        _.each(this.treeNodeCurrent.data.privacy.contactsAditional, (contact) => {
            if (contact === item) {
                contact.see = item.see;
                contact.modify = item.modify;
                contact.delete = item.delete;
                this.savePosition2()
            }
        });
    }
    updateExceptionPosition(item: any) { 
        _.each(this.treeNodeCurrent.data.privacy.contactsException, (contact) => {
            if (contact === item) {
                contact.see = item.see;
                contact.modify = item.modify;
                contact.delete = item.delete;
                this.savePosition2()
            }
        });
    }

    // uses selectContactComp , recibes event with selected contacts
    employeesPosition: any = []; // eomployees  list after load
    addNewContactsEmployeePosition(event: any) {
        let contactsSelected = event;
        contactsSelected.forEach((item, i) => {
            this.treeNodeCurrent.data.employees_position.push(item);
            if (i >= contactsSelected.length - 1) {
                this.treeNodeCurrent.data.employees_position.forEach((item, i) => {
                    this.selectContactComp.contactsSelectedHash[item.id] = true;
                    if (i >= contactsSelected.length - 1) {
                        this.savePosition2()
                    }
                })
            }
        })
    }

    deleteContactsEmployeePosition(contact: any) {
        let i = 0;
        let newEmployeesPosition = [];
        _.remove(this.treeNodeCurrent.data.employees_position, (item: any) => {
            return contact.id == item.id
        })
        setTimeout(() => {
            this.treeNodeCurrent.data.employees_position.forEach((item, i) => {
                this.selectContactComp.contactsSelectedHash[item.id] = true;
                if (i >= this.treeNodeCurrent.data.employees_position.length - 1) {
                    this.savePosition2()
                }
            })
        }, 200);
    }

    onNavChangeNav3(changeEvent: NgbNavChangeEvent) {

        // set ini values on position empluyee  tab selected  
        if (changeEvent.nextId === 3) { //  postition employee
            if (this.positionCurrent.PositionPurpose == null || this.positionCurrent.PositionPurpose == "") {
                this.positionCurrent.PositionPurpose = "[]";
            }
            this.employeesPosition = JSON.parse(this.positionCurrent.PositionPurpose)
            if (this.employeesPosition) {
                setTimeout(() => {
                    this.employeesPosition.forEach((item) => {
                        this.selectContactComp.contactsSelectedHash[item.id] = true;
                    })
                }, 0)
            }
        }
    }


    savePosition2() {
        let position = this.positionCurrent;

        this.treeOrg.treeModel.doForAll((item) => {
            if (position.ID == item.data.position.ID) {
                item.data.position = position;
                this.savePosition(position, this.treeOrg);
            }
        })


        return;
    }

    //////////end new autocomplete
    // end search contacts , aditional , exceptions


    expandAllSheetNodes() {
        this.showNodesByLevel(20000)
        this.nodeGraphLevelSelected = undefined;
    }


    contractAllSheetNodes() {
        this.showNodesByLevel(0)
        this.nodeGraphLevelSelected = 0;
    }

    gElements: any = [];
    showNodesByLevel(nodeGraphLevelSelected: any) { // show graph nodes by level

        if (nodeGraphLevelSelected == null || nodeGraphLevelSelected == undefined) {
            nodeGraphLevelSelected = 20000;
        }
        if (nodeGraphLevelSelected < 0) {
            nodeGraphLevelSelected = 0;
            this.nodeGraphLevelSelected = 0;
        }
        let els = this.paperView.graph.getElements()
        //this.paperView.graph.clear();
        els.forEach((elem) => {

            var outbooundLinksCount = this.paperView.graph.getConnectedLinks(elem, {
                inbound: true
            });
            if (elem.attributes.org_level > nodeGraphLevelSelected) {
                elem.attr('./display', 'none');
                outbooundLinksCount.forEach((link) => {
                    link.attr('./display', 'none');
                })

            } else {
                elem.attr('./display', 'visible');
                outbooundLinksCount.forEach((link) => {
                    link.attr('./display', 'visible');
                })
            }
        })
    }

    active3: any = 1;
    openConfigDefaultShapeModal(event, inputFormTemplate) {  // deafult config shape modal
        if (!this.sheetSelected.ID) {
            alert("No Sheet Selected!");
            return;
        }
        this.getActiveSheetShapesDefaults()

        this.contactsAditionalHash = {} 
        this.contactsExceptionHash = {} 
        if (this.paperView.shapeProperties.privacy.contactsAditional) {
            this.paperView.shapeProperties.privacy.contactsAditional.forEach((item) => {
                this.contactsAditionalHash[item.name] = true
            })
        }
        if (this.paperView.shapeProperties.privacy.contactsException) {
            this.paperView.shapeProperties.privacy.contactsException.forEach((item) => {
                this.contactsExceptionHash[item.name] = true
            })
        }
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'lg',
            scrollable: false
        });
    }
    saveActiveSheetShapesDefaults() {
        this.saveConfig('sheet' + this.sheetSelected.ID, JSON.stringify(this.paperView.shapeProperties))
        setTimeout(() => {
            this.getActiveSheetShapesDefaults()
        }, 3000);
    }

    getActiveSheetShapesDefaults() { // get defaults foe active sheet
        if (!this.sheetSelected || !this.sheetSelected.ID) {
            return;
        }
        this.http.get < any > (urlApi + '/config/sheet' + this.sheetSelected.ID)
            .subscribe(
                (any) => {
                    if (any && any[0]) {
                        if (any[0].Value != "") {
                            this.paperView.shapeProperties = JSON.parse(any[0].Value);
                            if (!this.paperView.shapeProperties.privacy) {
                                this.paperView.shapeProperties.privacy = {
                                    enableAditional: false,
                                    enableException: false,
                                    contactsAditional: [],
                                    contactsException: [],
                                }
                            }
                        } else { //init properties if new or not exists

                            this.paperView.shapeProperties = {
                                width: 180,
                                height: 70,
                                fill: {
                                    type: 'none',
                                    color: 'rgba(255,255,255,0.1)',
                                    opacity: 1
                                },
                                textBox: {
                                    verticalAlligment: 'middle',
                                    textDirection: 'horizontal',
                                    textAdjusment: '',
                                    topMargin: 0,
                                    leftMargin: 0,
                                    rigthMargin: 0,
                                    bottomMargin: 0
                                },
                                line: {
                                    type: 'solid',
                                    color: '#45d9d9',
                                    opacity: 1,
                                    width: 3
                                },
                                privacy: {
                                    enableAditional: false,
                                    enableException: false,
                                    contactsAditional: [],
                                    contactsException: []
                                }
                            }
                        }
                    }
                },
                err => {
                    if (err.error && err.error.message) {
                        alert(err.error.message);
                    }
                    return;
                }
            );
    }

    openTranslateAllModal(event, inputFormTemplate) { // translate graph
        if (!this.sheetSelected.ID) {
            alert("No Sheet Selected!");
            return;
        }

        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'sm',
            scrollable: false
        });
    }

    translateAll(dir: any, units: any) { // translate all nodes on sheet n units 
        if (!units) { units = 0 };
        if (dir == "up") { this.paperView.graph.translate(0, Math.trunc(units * (-1))) }
        if (dir == "left") { this.paperView.graph.translate(Math.trunc(units * (-1)), 0) }
        if (dir == "right") { this.paperView.graph.translate(Math.trunc(units), 0) }
        if (dir == "down") { this.paperView.graph.translate(0, Math.trunc(units)) }
    }

    setSheetNewSize(event: any) { // on paper size dimentions change
        if (!this.sheetSelected.ID) {
            alert("No Sheet Selected!");
            return;
        }
        if (event.w && event.h) {
            this.sheetSelected.Attrs = JSON.stringify(event); // save new sheet dimentions
        }
    }

    nodeGraphNameChange(event: any) { // when node name  on graph is changed, update on tree node
        let treeNode = this.treeOrg.treeModel.getNodeBy((item) => {
            return item.data.id == event.tree_id
        })
        if (treeNode) {
            treeNode.data.name = event.name.replace('(a) ','');
            treeNode.data.position.PositionName = event.name.replace('(a) ','');
        }
        this.positionCurrent = treeNode.data.position;
        this.treeOrg.treeModel.update();
        this.onUpdateTree(null, this.treeOrg);
    }

    graphNodeAdded(event: any) { // new node added on graph, check for element tree id to relate both
        let gEl = _.find(this.paperView.graph.getElements(), (gEl) => { return gEl.attributes.id == event.attributes.id })
        let treeNode = this.treeOrg.treeModel.getNodeBy((item) => {
            return item.data.id == gEl.attributes.tree_id
        })
        if (treeNode) {} else { // new sheet node does not exist on tree, use father id, to create new tree node and associate both
            let gElParent = _.find(this.paperView.graph.getElements(), (gEl) => { return gEl.attributes.id == event.attributes.org_parent_id })
            let treeNodeParent = this.treeOrg.treeModel.getNodeBy((item) => {
                return item.data.id == gElParent.attributes.tree_id
            })
            if (this.treeOrg.treeModel.nodes.length > 0) {
                if (treeNodeParent) {
                    let nodePosition: Position = new Position;
                    nodePosition.PositionName = gEl.attributes.attrs[".rank"].text;
                    nodePosition.PositionCode = gEl.attributes.id; // temp after creation set blank
                    nodePosition.PositionInmediateSuperior = treeNodeParent.data.name;
                    nodePosition.DedicationRegime='position';
                    if (gEl.attributes.position_type=="temporal"){                   
                         nodePosition.DedicationRegime='temporal';
                    }

                    treeNodeParent.data.children.push({
                        name: gEl.attributes.attrs[".rank"].text,
                        position: nodePosition,
                        children: []
                    });
                    setTimeout(() => {
                        let newTreeNode = this.treeOrg.treeModel.getNodeBy((item) => {
                            return item.data.position.PositionCode == gEl.attributes.id
                        })
                        if (newTreeNode) {
                            _.each(this.paperView.graph.getElements(), (item) => {
                                if (item.attributes.id == gEl.attributes.id) {
                                    item.attributes.tree_id = newTreeNode.data.id;
                                    newTreeNode.data.position.PositionCode = "";
                                }
                            });

                        }

                    }, 300)
                }
            } else { //is root
                let nodePosition: Position = new Position;
                nodePosition.PositionName = gEl.attributes.attrs[".rank"].text;
                nodePosition.PositionCode = gEl.attributes.id; // temp after creation set blank

                this.treeOrg.treeModel.nodes.push({
                    name: gEl.attributes.attrs[".rank"].text,
                    position: nodePosition,
                    children: []
                })
                setTimeout(() => {
                    let newTreeNode = this.treeOrg.treeModel.getNodeBy((item) => {
                        return item.data.position.PositionCode == gEl.attributes.id
                    })
                    if (newTreeNode) {
                        _.each(this.paperView.graph.getElements(), (item) => {
                            if (item.attributes.id == gEl.attributes.id) {
                                item.attributes.tree_id = newTreeNode.data.id;
                                newTreeNode.data.position.PositionCode = "";
                            }
                        });

                    }

                }, 300)


            }

            if (this.sheetSelected && this.sheetSelected.ID && this.sheetSelected.ID != 0) {
                setTimeout(() => {this.saveSheet(this.sheetSelected);}, 800)
            }    

            this.treeOrg.treeModel.update();
            this.onUpdateTree(null, this.treeOrg);
        }
    }


    setNodeNameDisplacement(text: any) {
        if (text == 'displacement') {
            this.nodeName = "**Displacement**"
        } else {
            this.nodeName = '';
        }
    }


    attachmentsHash = {}
    addAttachment(attachment: any) { // add position attachements
        if (this.attachmentsHash[attachment.name]) { 
            return //
        } //
        this.attachmentsHash[attachment.name] = true //
        this.treeNodeCurrent.data.attachments.push({
            name: attachment.name
        });
        this.onUpdateTree(null, this.treeOrg);
    }


    deleteAttachment(attachment: any, tree: any) { // delete position attachements
        this.attachmentsHash[attachment.name] = false //
        _.remove(this.treeNodeCurrent.data.attachments, (item) => {
            return item === attachment
        })
        this.savePosition(this.positionCurrent, tree);
    }


    fileToUpload: File [] = [];
    handleFileInput(files: FileList) {
        this.fileToUpload = []
        // this.fileToUpload = files.item(0);
        for (var i = 0; i < files.length; i++) { 
            this.fileToUpload.push(files.item(i));
        }
    }



    checkForAttachmentExistingName(newAttachmentName:any,cb:any){
        let value = false
        if (this.treeNodeCurrent.data && this.treeNodeCurrent.data.attachments){
           if(this.treeNodeCurrent.data.attachments.length<=0){
            cb(false);
            return;
           }

            this.treeNodeCurrent.data.attachments.forEach((attachment,i)=>{
                newAttachmentName.forEach(element => {
                    if( element.name == attachment.name.substr(11,attachment.name.length-1)){
                       value = true                        
                       }
                     
                });
            })
            if(value){
                cb(true);
                return
               } else {
                cb(false);
                return;
               }
        }else{
               cb(false);
                return;
              }
    } 

    postFile(recordToEdit: any, fileToUpload: File[], tree: any) { // upload attachment
        console.log(fileToUpload)
        this.checkForAttachmentExistingName(fileToUpload ,(isNameExist)=>{
                if (isNameExist){  alert("File name exists!");  return}

                console.log(fileToUpload.length)
                
                for (var i = 0; i < fileToUpload.length; i++) { 
                    console.log("Ffffffffff")
                    const formData: FormData = new FormData();
                    formData.append("upload", fileToUpload[i], fileToUpload[i].name );
                    this.http.post < any > (urlApi + '/upload-file', formData)
                    .subscribe(
                        (any) => {
                            if (any) {
                                this.modalWindow.close();
                                if (any && any.file != "/files/nofile") {
                                    console.log(any.file)
                                    this.addAttachment({
                                        name: any.file
                                    });
                                    this.savePosition(this.positionCurrent, tree);
                                }
                                return;
                            }
                        },
                        err => {
                            alert(err)
                            return;
                        }
                    );
                }
                
                // formData.append('upload', fileToUpload, fileToUpload.name);
                return



        })
    }
    fileNameSub(fileName: any) {
        return fileName.substr(11, fileName.length - 1)
    }



    openFileUpload(event, uploadTemplate) {
        event.preventDefault();
        this.modalWindow = this.modalService.open(uploadTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }

    openSetImendiateSuperior(event, template) {  // open set inmediate superior modal
        event.preventDefault();
        this.modalWindow = this.modalService.open(template, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }

    onNodeSelectSetImendiateSuperior($event, tree: any, modal: any) { //set inmediate superior modal
        let node = tree.treeModel.getFocusedNode();
        let nodeCurrent = this.treeOrg.treeModel.getNodeBy((item) => { return this.treeNodeCurrent.data.id == item.data.id })
        let parentNode: any = nodeCurrent.realParent ? nodeCurrent.realParent : nodeCurrent.treeModel.virtualRoot;
        if (nodeCurrent) {
            this.treeOrg.treeModel.moveNode(
                nodeCurrent, {
                    dropOnNode: false,
                    index: 0,
                    parent: node
                }, {
                    index: 0,
                    parent: parentNode
                });
            this.positionCurrent.PositionInmediateSuperior = node.data.name;
            this.treeOrg.treeModel.update();
            this.onUpdateTree(null, this.treeOrg);
            this.treeOrg.treeModel.update();
            this.onUpdateTree(null, this.treeOrg);
            setTimeout(() => { this.updateAllSheetsFromTreeNode(); }, 300)
        }
        modal.close()
        return;
    }


    onNodeSelectFunctionRel($event, tree: any, modal: any) { //set functional rel
        let functionalRelNode = tree.treeModel.getFocusedNode();
        this.addFunctionalRel(functionalRelNode, tree)
        modal.close()
        return;
    }

    openAddFunctionalRel(event, template) {  // open functional rel modal
        this.functionalrelsHash = {}
        this.treeNodeCurrent.data.functionalrels.forEach((item) => {
            this.functionalrelsHash[item.id] = true;
        })
        event.preventDefault();
        this.modalWindow = this.modalService.open(template, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }

    functionalrelsHash = {}
    addFunctionalRel(functionalrel: any, tree: any) { //
        if (this.positionCurrent.ID == functionalrel.data.id) {
            return
        }
        let nodeCurrent = tree.treeModel.getNodeById(this.positionCurrent.ID);

        if (functionalrel.data.id == nodeCurrent.parent.id) {
            alert("Functional Relationship not allowed on same parent")
            return
        }

        if (functionalrel.level >= nodeCurrent.level) {
            alert("Functional Relationship only allowed on upper levels")
            return
        }
        if (this.functionalrelsHash[functionalrel.data.id]) { 
            return 
        } 
        this.functionalrelsHash[functionalrel.data.id] = true 
        this.treeNodeCurrent.data.functionalrels.push({
            name: functionalrel.data.name,
            id: functionalrel.data.id
        });
        this.addFunctionalRelTreeNode(tree, nodeCurrent, functionalrel)
        this.savePosition(this.positionCurrent, tree);
        if (this.sheetSelected && this.sheetSelected.ID && this.sheetSelected.ID != 0) {
            if (this.activeId == this.sheetSelected.ID) {
                setTimeout(() => {
                    this.loadSheet(this.sheetSelected)
                }, 200)
            }
        }
    }


    refreshSheetOnView() {
        if (this.activeSheets[this.activeId]) {
            this.loadSheetByID(this.activeId);
        }
    }



    deleteFunctionalRel(functionalrel: any, tree: any) { 
        this.functionalrelsHash[functionalrel.id] = false 
        let treeNodeFunctionalRel = this.treeOrg.treeModel.getNodeBy((item) => {
            return item.data.functionalRelTargetId == this.positionCurrent.ID
        })
        if (treeNodeFunctionalRel) {
            this.deleteNodeById(this.treeOrg, treeNodeFunctionalRel)
        }
        _.remove(this.treeNodeCurrent.data.functionalrels, (item) => {
            return item === functionalrel
        })
        this.savePosition(this.positionCurrent, this.treeOrg);

        if (this.sheetSelected.ID != 0) {
            setTimeout(() => { this.refreshSheetOnView(); }, 200)
        }
    }


    deleteNodeById(tree: any, nodeDel: any) { 
        let node = tree.treeModel.getNodeById(nodeDel.id);
        let parentNode = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        _.remove(parentNode.data.children, function(child) {
            return child === node.data;
        });
        //new, delete node on all sheets 
        this.refreshProjectSelectedSheets((projectSheets) => {
            this.paperView.deleteNodeAllSheets(node, projectSheets);
        })
        tree.treeModel.update();
        this.onUpdateTree(null, tree);

    }

    deleteFunctionalRelById(functionalRelTarget: any, tree: any) { 
        let nodeWithFunctionRel = tree.treeModel.getNodeById(functionalRelTarget.id)
        if (nodeWithFunctionRel && nodeWithFunctionRel.data) {
            this.functionalrelsHash[functionalRelTarget.id] = false 
            _.remove(nodeWithFunctionRel.data.functionalrels, (item: any) => {
                return item.id === functionalRelTarget.idSource
            })
            //      this.savePosition(this.positionCurrent, tree);
        }
        return
    }


    createNodeFunctionalRel(tree: any, parentNode: any, functionralRelId: any, nodeWithFunctionalRel: any, cb) {
        let nodePosition: Position = new Position;
        nodePosition.PositionName = '(f)' + nodeWithFunctionalRel.data.name;
        nodePosition.PositionCode = functionralRelId;
        parentNode.data.children.splice(0, 0, {
            name: '(f)' + nodeWithFunctionalRel.data.name,
            position: nodePosition,
            children: [],
            isfunctionalrel: true,
            functionalRelTargetId: nodeWithFunctionalRel.data.id,
            functionalRelSourceId: parentNode.data.id,
            functionalRelTargetName: nodeWithFunctionalRel.data.name,
            functionalRelSourceName: parentNode.data.name
        });
        tree.treeModel.update();
        setTimeout(() => {
            cb()
        }, 300)
    }

    addFunctionalRelTreeNode(tree: any, nodeCurrent: any, functionalRelParentNode: any) {
        let parentNode: any = functionalRelParentNode;
        let functionralRelId: any = "f-" + this.getGuid();
        this.createNodeFunctionalRel(tree, parentNode, functionralRelId, nodeCurrent, () => {})

    }

    selectMultiContacts(event) { 
        // event.preventDefault();
    }

    searchMultiContacts = (text$: Observable < string > ) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(term => term.length < 1 ? [] :
                //        this.contacts.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
                this.contacts.filter(v => v.Name.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
        )



    getSheetMinLevelNode(cells: any) { //get root node on  sheet
        let lowest = Number.POSITIVE_INFINITY;
        let tmp;
        let node;
        for (var i = cells.cells.length - 1; i >= 0; i--) {
            tmp = cells.cells[i].org_level;
            if (tmp < lowest) {
                lowest = tmp;
                node = cells.cells[i];
            };
        }
        return node;
    }


    updateAllSheetsFromTreeNode() { //executed only when node is not root 
        this.treeOrg.treeModel.update();
        let root = this.treeOrg.treeModel.getFirstRoot()
        this.updateNodesTreesParent(root.data);  // update parents if changed
        setTimeout(() => { this.onUpdateTree(null, this.treeOrg); }, 1000)


        this.projectSheets.forEach((sheet) => {
            if (sheet.Data != "") {
                let cells = JSON.parse(sheet.Data);
                let rootSheetNode = this.getSheetMinLevelNode(cells);
                let newCells = { cells: [] };
                if (!rootSheetNode) {
                    console.log("updateAllSheetsFromTreeNode", "!rootSheetNode", sheet.SheetName)
                }
                if (rootSheetNode) {
                    let treeNodeRootForSheet = this.treeOrg.treeModel.getNodeBy((node) => node.data.id == rootSheetNode.tree_id)
                    if (!treeNodeRootForSheet) {
                        console.log("updateAllSheetsFromTreeNode", "!treeNodeRootForSheet", sheet.SheetName)
                    }
                    if (treeNodeRootForSheet) {
                        let newCell = this.paperView.memberDef(null,
                            (350),
                            (50),
                            treeNodeRootForSheet.data.name.replace('(a) ',''), treeNodeRootForSheet.data.name.replace('(a) ',''), 'male.png', '#ffffff', '#797979', false)
                        newCell.attributes.tree_id = treeNodeRootForSheet.data.id;
                        newCells.cells.push(newCell.attributes);
                        sheet.Data = JSON.stringify(newCells);
                        this.refreshSheetOnView();
                        this.generateSheetDataRecur(treeNodeRootForSheet, newCell.attributes, newCells, sheet);
                    } //  if treeNodeRootForSheet
                } //  if rootSheetNode

            }
        })
    }



    


    updateNodesTreesParent(activeNode: any) {
        if (activeNode.children&&activeNode.children.length > 0) {
            activeNode.children.forEach((child) => {
                    child.position.PositionInmediateSuperior = activeNode.name;
                    this.treeOrg.treeModel.update();
                    this.updateNodesTreesParent(child);
           })
        }
    }

    generateSheetDataRecur(activeNode: any, parentNew: any, cells: any, sheet: any) {
        let positionType = 'position'
        if (activeNode.children.length > 0) {
            let unitX = -1;
            activeNode.children.forEach((child) => {
                if (child.data.isfunctionalrel == true) {} else {
                    let newCell = this.paperView.memberDef(parentNew,
                        parentNew.position.x + (200 * unitX),
                        parentNew.position.y + (130),
                        child.data.name.replace('(a) ',''), child.data.name.replace('(a) ',''), 'male.png', '#ffffff', '#797979', false);
                    newCell.attributes.tree_id = child.data.id;
                    cells.cells.push(newCell.attributes);
                    let newLink = this.paperView.getLinkDef(parentNew, newCell, child.data.is_displacement);
                    cells.cells.push(newLink.attributes);
                    sheet.Data = JSON.stringify(cells);
                    this.refreshSheetOnView();
                    unitX = unitX + 1;
                    this.generateSheetDataRecur(child, newCell.attributes, cells, sheet)
                }


            })
        }
    }
}