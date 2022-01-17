import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ɵCompiler_compileModuleSync__POST_R3__ } from '@angular/core';
import { Position } from '../models/position';
import { Sheet } from '../models/sheet';
import { Project } from '../models/project';
import { Contact } from '../models/contact';
import { ContactRight } from '../models/contactright';
import { NgbAccordionConfig, NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
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
import { node } from 'canvg/lib/presets';
import { IActionMapping, ITreeOptions, KEYS, TREE_ACTIONS } from '@circlon/angular-tree-component';
import { event } from 'jquery';
import { SelectNodeComponent } from '../select-node/select-node.component';
import { UiSwitchModule } from 'ngx-ui-switch';
import { HttpHeaders } from '@angular/common/http';

const positionsName = [];

const urlApi = GlobalService.apiURL;

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    providers: [NgbAccordionConfig]

})
export class HomeComponent implements OnInit, AfterViewInit {
    @ViewChild('tree') treeOrg;
    @ViewChild('accordion') accordion;
    @ViewChild('selectContactComp') selectContactComp;  // autocomplete for contacts
    @ViewChild('treenodesearchinput') treeNodeSearchInput;
    @ViewChild('errorTemplate') errorTemplate;
    @ViewChild('alertContact') alertContact;
    @ViewChild('paperView', { // jointjs paper 
        static: true
    }) paperView: JointComponent;
    @ViewChild(SelectNodeComponent) selectNodeComponent: SelectNodeComponent; 

    nodeType: any = "child";
    name = 'OrgChart';
    modalWindow: NgbModalRef;
    modalWindowConfirm: NgbModalRef;
    sheetToEdit: Sheet;
    projectToEdit: Project;
    projects: Project[];
    contactToEdit: Contact;
    // contacts: Contact[];
    paperDimensions: any = {
        width: 1440,
        heigth: 900
    }
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
    panelExpanded: boolean = true;
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
    optionsChecked = [];
    txtSearchAditional = '';
    isSheetToEdit = true;
    contactsSearch:any;
    PositionEmployee_listopened=true;
    actionMapping: IActionMapping = {
        mouse: {
          contextMenu: (tree, node, $event) => {
            // $event.preventDefault();
            // alert(`context menu for ${node.data.name}`);
          },
          dblClick: (tree, node, $event) => {
            console.log("DOUBLE CLICK")
            this.panelExpanded = false;
          },
          click: (tree, node, $event) => {
            $event.shiftKey
              ? TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, $event)
              : TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
            
            setTimeout(()=>{
                if(!node.isActive) TREE_ACTIONS.ACTIVATE(tree, node, $event);
            }, 300)            
            
            //node.toggleExpanded();    
          },
          dragEnd: (tree, node, $event) => {
              console.log("Dragged Node: " + node.data.name);
            //   tree.setActiveNode(node, true);
              this.generateGraph(this.treeOrg);
          },
          drop: (tree, node, $event, { from, to }) => {
              if(to.parent.data.name){
                const activeNodes = tree.activeNodes;
                if (activeNodes.length > 1) {
                    activeNodes.forEach(item => {
                        const currentItem = tree.getNodeById(item.id);
                        tree.moveNode(currentItem, to);
                    });
                } else {
                    tree.moveNode(from, to);
                }   
              }            
          },
          /*
          mouseOver: (tree, node, $event) => {
            $event.preventDefault();
            console.log(`mouseOver ${node.data.name}`);
          },
          mouseOut: (tree, node, $event) => {
            $event.preventDefault();
            console.log(`mouseOut ${node.data.name}`);
          }*/
        },
        keys: {
          [KEYS.ENTER]: (tree, node, $event) => {
            if (node.hasChildren) {
                TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
            }
            node.mouseAction('click',$event);
          }
        }
      };
    
      options: ITreeOptions = {
        actionMapping: this.actionMapping,
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

      treeModalActionMapping: IActionMapping = {
        mouse: {
            checkboxClick: (tree, node, $event) => {
                TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, $event)
                console.log('tree.activeNodes')
                this.selectedFuncRels = tree.activeNodes;

                //   _.each(tree.activeNodes, (item)=>{
                //       console.log(item.data.name)
                //   })                  
            },
        },
        keys: {
          [KEYS.ENTER]: (tree, node, $event) => {
          }
        }
      };
    
    treeModalOptions: ITreeOptions = {
        actionMapping: this.treeModalActionMapping,
        useCheckbox: true,
        useTriState: true,
        levelPadding: 10, //20
        animateExpand: true,
        scrollOnActivate: true,
        animateSpeed: 30,
        animateAcceleration: 1.2,
        nodeHeight: 23, //23
      };

    activeTab = 1;
    textSearch = "";
    textSearch2 = "";
    filterNodeByLevel = 0;
    graphShapes: any;
    paperShapes: any;
    userId: any;
    userName: any;
    accessToken: any;
    userContacts: any = [];
    errorMessage: any;
    selectedDataValue:any;

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

        //Switch

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

    uploadFile(event, tree) {
        
        console.log("file-upload-event", event)
        let value = event[0]
        this.checkForAttachmentExistingName(value, (isNameExist) => {
            if (isNameExist) {
              alert("File name " + value.name + " already exists! ");
            } else {
              console.log("Ffffffffff");
              const formData: FormData = new FormData();
              formData.append("upload", value, value.name);
              this.http.post<any>(urlApi + "/upload-file", formData).subscribe(
                (any) => {
                  if (any) {
                    if (any && any.file != "/files/nofile") {
                      console.log(any.file);
                      this.addAttachment({
                        name: any.file,
                      });
                      this.savePosition(this.positionCurrent, tree);
                    }
                    return;
                  }
                },
                (err) => {
                  alert(err);
                  return;
                }
              );
            }
          });
    }
    onDrop($event) {
        console.log($event);
    }

    allowDrop(element) {
        console.log(element);
        return true;
    }

    dropAndSelect(event: any) {
        console.log("dropAndSelect");
        this.paperView.drop(event);
        setTimeout(_ => {
            let length = this.paperView.graph.getElements().length;
            if (length == 1) {
                    this.treeOrg.treeModel.getFirstRoot().toggleActivated();
            } else {
                let cell = this.paperView.graph.getElements()[length-1];
                this.treeNodeCurrent = this.treeOrg.treeModel.getNodeBy(
                    (item) => {
                        console.log(cell.attributes)
                        if(cell.attributes.tree_id == item.data.id) {
                            console.log('tree id exist');
                            const currentNode = this.treeOrg.treeModel.getNodeById(cell.attributes.tree_id);
                            TREE_ACTIONS.ACTIVATE(this.treeOrg, currentNode, event);
                            this.treeOrg.treeModel.expandAll()
                        }
                        return cell.attributes.tree_id == item.data.id 
                    }
                );
                TREE_ACTIONS.ACTIVATE(this.treeOrg, this.treeNodeCurrent, event);
            }
            if (this.sheetSelected.ID != 0) {
                //Deseleccionar todos los graph nodes, que son posibles seleccionados
                let length = this.paperView.graph.getElements().length;
                let cell = this.paperView.graph.getElements()[length-1];
                console.log(cell);
                //Deseleccionar todos los graph nodes, que son posibles seleccionados
                _.each(this.paperView.graph.getElements(), (kcell) => { 
                    if(kcell&&kcell.attributes.type.includes('org.Member')){
                        if(kcell.attributes.tree_id !=  cell.attributes.tree_id) {
                            if(kcell.attributes.type == 'org.Member3') {
                                this.paperView.member2Def(kcell);
                            }
                        }
                    }                
                })
                // if(cell&&cell.attributes.type.includes('org.Member')){
                //     if(cell.attributes.type == 'org.Member3') {
                //         this.paperView.member2Def(cell);
                //     }
                // }               
               //Seleccionar el nodo que genera el evento
               let toSelectCell = this.paperView.graph.getElements()[length-1]
               if(toSelectCell) {
                   this.paperView.member3Def(toSelectCell);
                   toSelectCell.attributes.attrs['.sibling'].visibility = (toSelectCell.attributes.org_level=='0')? 'hidden' : 'visible'; //Hide sibling circles for root node.
               }
               this.saveSheet(this.sheetSelected);
               //setTimeout(()=>{this.refreshSheetOnView();},1000) 
            }
        }, 1000);
    }

    onTreeEvent(event: any) {  // any event on tree component 
        console.log("OnTreeEvent: "+ event.eventName)
            if (event.eventName == 'moveNode') { // if a tree node is moved updates all sheets and related data
                this.updateAllSheetsFromTreeNode();
                return
            } else if (event.eventName == 'activate') { // if a tree node change focus
                if (this.sheetSelected.ID&&this.sheetSelected.ID != 0) {
                    let node = this.treeOrg.treeModel.getNodeBy(node=>{ 
                        return node.data.id == event.node.data.id;
                    });
                    this.simulateGraphNodeClickEvent(node);
                }
                return
            }
    }

    simulateGraphNodeClickEvent(node){
        let event = {
            attributes: { 
                tree_id: ''
            }
        }
        event.attributes.tree_id = node.data.id
        this.selectGraphNode(event, this.treeOrg)
    }

    selectGraphNode($event:any,tree:any){
        console.log("Select Graph Node: ")
        console.log($event)
        if (this.sheetSelected.ID != 0) {
             //Deseleccionar todos los graph nodes, que son posibles seleccionados
             _.each(this.paperView.graph.getElements(), (cell) => { 
                if(cell&&cell.attributes.type.includes('org.Member')){
                    if(cell.attributes.tree_id !=  $event.attributes.tree_id) {
                        if(cell.attributes.type == 'org.Member3') {
                            this.paperView.member2Def(cell);
                        }
                    }
                }
                
            })

            //Seleccionar el nodo que genera el evento
            let toSelectCell = _.find(this.paperView.graph.getElements(), (cell) => { return cell.attributes.tree_id ==  $event.attributes.tree_id })
            console.log(toSelectCell);
            if(toSelectCell) {
                this.paperView.member3Def(toSelectCell);
                toSelectCell.attributes.attrs['.sibling'].visibility = (toSelectCell.attributes.org_level=='0')? 'hidden' : 'visible'; //Hide sibling circles for root node.
            }
            this.saveSheet(this.sheetSelected);
            //setTimeout(()=>{this.refreshSheetOnView();},1000) 
        }
    }

    onDeleteGraphNodeEvent($event){
        let cell = $event.model.attributes;
        console.log(cell);
        let treeNode = this.treeOrg.treeModel.getNodeBy(node => node.id==cell.tree_id);
        TREE_ACTIONS.ACTIVATE(this.treeOrg,treeNode,event);
        
        setTimeout(()=>{this.deleteNodesConfirmedByUser(treeNode);},1000);
    }

    lastNodeSearchedId: any;
    lastNodeSearchedKeyword: any;
    findTreeNodeByName(tree: any, search: any) {
        this.treeOrg.treeModel.expandAll();
        var regex = new RegExp(search, 'gi');
        let node = tree.treeModel.getNodeBy((node) => node.data.name.match(regex))
        if (node) {
            node.setActiveAndVisible();
        }
        this.lastNodeSearchedKeyword = this.treeNodeSearchInput.nativeElement.value
        if (node) {
            this.lastNodeSearchedId = node.data.id;
        }
        setTimeout(_ => {
            this.paperView.getCellsByText(search);
        }, 300);
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
        this.treeOrg.treeModel.expandAll();
        let focused = this.treeOrg.treeModel.getFocusedNode();
        if (!focused) {
            this.treeOrg.treeModel.focusPreviousNode()
        } else {
            this.getNextNodeCoincidence(focused.findNextNode());
        }
        setTimeout(_ => {this.paperView.getNextCellByCurrentSearch()}, 300);
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
        this.treeOrg.treeModel.expandAll();
        let focused = this.treeOrg.treeModel.getFocusedNode();
        if (!focused) {
            this.treeOrg.treeModel.focusPreviousNode()
        } else {
            this.getPreviousNodeCoincidence(focused.findPreviousNode());
        }
        setTimeout(_ => {this.paperView.getPreviousCellByCurrentSearch()}, 300);
    }

    updateCurrCellDedicationRegimeOnAllSheets(cell, position_type){
        let link_look = (position_type=='temporal')? '5,10' : 'null';
        _.each(this.projectSheets, sheet=>{
            let sheetCurr =  JSON.parse(sheet.Data);
            _.each(sheetCurr.cells, shCell=>{
                if(shCell && shCell.attrs && shCell.tree_id == cell.attributes.tree_id) {
                    shCell.position_type = position_type;
                    shCell.attrs['.card'].strokeDasharray = link_look;
                }                    
            }) 
            let currData = JSON.stringify(sheetCurr); 
            sheet.Data = currData;
            this.updateSheet(sheet);    
        })
    }

   changeDedicationRegime(position:any,tree:any){  // change position dedication regime
        if (this.sheetSelected.ID != 0) {
            let cell = _.find(this.paperView.graph.getElements(), (item) => { return item.attributes.tree_id ==  position.ID })
            var treeNode = this.treeOrg.treeModel.getNodeBy((nodeIn) => nodeIn.data.id == position.ID);
            treeNode.data.name = this.setAandTWhenNeeded(position);

            let link_look;
            let position_type;
            if(position.DedicationRegime=='temporal') {
                link_look = '5,10';
                position_type = 'temporal';
            }
            if(position.DedicationRegime=='position') {
                link_look = 'null';
                position_type = 'position';
            }
            cell.position_type = position_type;
            cell.attributes.position_type = position_type;
            cell.attr('.card/strokeDasharray', link_look);

            this.updateCurrCellDedicationRegimeOnAllSheets(cell, position_type);

            this.savePosition(position, tree);
            //this.saveSheet(this.sheetSelected);
        } 
   }

    mouseDownGraphNode(event: any) {
        if (event.action == 'up') { this.circleAddNodeNorth(this.treeOrg, event); }
        else if (event.action == 'down') { this.circleAddNodeSouth(this.treeOrg, event); }
        else if (event.action == 'left') { this.circleAddNodeWest(this.treeOrg, event); }
        else if (event.action == 'right') { this.circleAddNodeEast(this.treeOrg, event); }
    }
    
    graphNodeSelected(event: any) {   // on graph(sheet) node selected
        this.treeNodeCurrent = this.treeOrg.treeModel.getNodeBy((item) => { return event.attributes.tree_id == item.data.id });
        this.treeOrg.treeModel.expandAll();
        TREE_ACTIONS.ACTIVATE(this.treeOrg,this.treeNodeCurrent,event);
        if (this.treeNodeCurrent) {
            this.positionCurrent = this.treeNodeCurrent.data.position;
            this.positionCurrent.ID = this.treeNodeCurrent.data.id;
            this.positionCurrent.DedicationRegime='position';
            if(!this.treeNodeCurrent.isRoot){
                this.positionCurrent.PositionInmediateSuperior=this.removeAandTfromName(this.treeNodeCurrent.parent.data.name);
            }
            

            //console.log(this.positionCurrent.PositionInmediateSuperior);
            

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

    clearFiltersOrSearchInputs(){
        this.textSearch = '';
        this.textSearch2 = '';
        this.nodeGraphLevelSelected = '';
        this.treeLevelFilter = '';
        return
    }

    saveBeforeLeaving(){
        //clear every search input or filter input
        this.clearFiltersOrSearchInputs();

        this.panelExpanded = true;

        let someSheetActive = false;
        _.each(this.activeSheets, (sheet)=>{
            if(sheet) someSheetActive = true;
        });

        if(!someSheetActive) return;

        this.saveNamePosition(this.positionCurrent,this.treeOrg);
        this.saveSheet(this.sheetSelected);
        //this.updateAllSheetsFromTreeNode();
    }

    onNavChange(changeEvent: NgbNavChangeEvent) {  // when selecting sheet tab 
        this.saveBeforeLeaving();
        this.loadSheetByID(changeEvent.nextId);
    }

    onAccordionChange(changeEvent: NgbPanelChangeEvent) { // Accordion change event
        this.panelsIds[changeEvent.panelId] = true;
    }

    findProjectByName(projectName: string){
        let projectFound: Project;
        _.forEach(this.projects, (project: Project) => {
            if(project.ProjectName == projectName) projectFound = project;
        })
        return projectFound;
    }

    getProjects() {   //currently get all projects, TODO: need to filter by user, external  contacts api server were not defined yet
        this.http.get < any > (urlApi + '/project')
            .subscribe(
                (any) => {
                    if (any) {
                        this.projects = any.sort((a, b) => {
                            let fa = a.ProjectName.toLowerCase(),
                                fb = b.ProjectName.toLowerCase();
                        
                            if (fa < fb) {
                                return -1;
                            }
                            if (fa > fb) {
                                return 1;
                            }
                            return 0;
                        });
                        console.log("Project List Retrieved")
                        console.log("ProjectSelected: ")
                        if(!this.projects[0]){
                            console.log("No project found in DB")
                        } else {
                            if(this.projectToEdit){
                                this.projectSelected = this.findProjectByName(this.projectToEdit.ProjectName);
                                if(this.projectSelected) this.loadProject(this.projectSelected)
                            }else{
                                this.loadProject(this.projects[0]);
                            }
                            //this.loadProject(this.projectSelected)
                        }
                        console.log(this.projectSelected)
                        
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



    getContacts() {   // get all contacts by user



        let userId = localStorage.getItem('userId');
        let accessToken =  localStorage.getItem('accessToken');

        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'text/plain',
                'Accept':'application/json',
                'access_token':accessToken
            })
        };

        this.http.get < any > (GlobalService.externalApiURLSource + 'contact/getContactsForUser/'+userId, httpOptions)
            .subscribe(
                (any) => {
                    if (any) {
                        this.contacts = any;
                        this.contactsSearch = any;
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


 //currently get all projects, TODO: need to filter by user, external  contacts api server were not defined yet

    getContacts0() {  
        this.http.get < any > (urlApi + '/contact')
            .subscribe(
                (any) => {
                    if (any) {
                        // this.contacts = any;
                        console.log(any);
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
                        this.projectSheets = any.sort((a, b) => {
                            let fa = a.SheetName.toLowerCase(),
                                fb = b.SheetName.toLowerCase();
                        
                            if (fa < fb) {
                                return -1;
                            }
                            if (fa > fb) {
                                return 1;
                            }
                            return 0;
                        });
                        //this.activeSheets = {};
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

    isEmpty(allData: Object) {
        if (Object.values(allData)[0].length == 0)
            return true;
        if (Object.values(Object.values(allData)[1]).length == 0)
            return true;
    }

    loadProject(project: any) {  // load project
        this.saveBeforeLeaving();
        this.panelExpanded = true;
        this.positionCurrent = new Position;
        this.accordion.expand("2") //open accordeon tree to activate tree
        this.accordion.expand("3") //open accordeon tree to activate tree
        this.isProjectFisrtTreeUpdate = true;
        this.projectSelected = project;
        console.log("Load Project: Project Selected: "+ this.projectSelected.ProjectName)
        console.log(this.projectSelected)
        this.sheets = [];
        this.activeSheets = {};
        let allData = {
            nodes: [],
            positions: {}
        }
        if (this.projectSelected.Data != "") {
            allData = JSON.parse(this.projectSelected.Data);
            console.log("Load project: All Data: ")
            console.log(allData);
        }
        this.nodes = [];
        if (Object.values(Object.values(allData)[0]).length ||
            Object.values(Object.values(allData)[1]).length) {
            console.log("Supuestamente hay all data && alldata.nodes")
           
            console.log("start loadProject nodes");
            this.nodes = allData.nodes;
            console.log(this.nodes);
            console.log("end loadProject nodes");

            setTimeout(()=>{
               let root = this.treeOrg.treeModel.getFirstRoot();   
               console.log("Load Project: let root = this.treeOrg.treeModel.getFirstRoot() ")
               console.log(root)
               if(root)  { root.setActiveAndVisible();}
            },300)
        }
        if(this.paperView.graph) this.paperView.graph.clear(); // instead of clearSheetSelected()

        this.getSheets(project);
        this.optionsChecked = []; //No selected or open sheets
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
                console.log("drawSheetFunctionalRels");
                console.log(item);
                if (item.data.functionalRelSourceId && item.data.functionalRelTargetId) {
                    this.paperView.addFunctionalRel(item.data.functionalRelSourceId, item.data.functionalRelTargetId);
                }
            }
        })
    }

    tempNames: string[] = [];
    getTemporalNodes(node){
        if(node&&node.name.includes('(t)')) {
            //console.log(node.name+": es temporal")
            //Remove '(a) ' and '(t) '
            let nodeName = this.removeAandTfromName(node.name); 
            this.tempNames.push(nodeName);
        }

        if(node&&node.children&&node.children.length>0){
            node.children.forEach(childNode => {
                this.getTemporalNodes(childNode);
            });
        }
    }

    updateTempNodesLook(cells){
        //Get temporal nodes
        this.getTemporalNodes(this.nodes[0]);

        //Update temporal nodes look
        this.tempNames.forEach(tempName=>{
            _.forEach(cells.cells, cell => {
                if(cell.attrs['.rank']){
                    let cellName = this.removeAandTfromName(cell.attrs['.rank'].text);
                    //si encuentro un nodo cell cuyo nombre esta entre los nodos temporal
                    //Hacer esa cell lucir temporal
                    if(cellName==tempName) {
                        cell.position_type = 'temporal'
                        if(cell.attrs['.card']) cell.attrs['.card'].strokeDasharray='5,10';
                        cell.attrs['.rank'].text = cellName;
                    }
                }
            });
        })
        this.tempNames = [];
        return cells;
    }

    loadSheet(sheet: any) { // load sheet 
        console.log("Load Sheet");
        this.sheetSelected = sheet;
        this.isSheetNodesTempView = false;
        //this.getActiveSheetShapesDefaults();
        console.log(this.sheetSelected);
        if (this.sheetSelected.Data != "") {
            let cells = JSON.parse(this.sheetSelected.Data);
            cells = this.updateTempNodesLook(cells);
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
                let width = this.paperDimensions.width > dim.w ? this.paperDimensions.width : dim.w;
                let heigth = this.paperDimensions.heigth > dim.h ? this.paperDimensions.heigth : dim.h;
                this.paperView.paper.setDimensions(width, heigth);
            }
        } else {
            console.log('true');
            this.sheetSelected.Attrs = JSON.stringify({ w: this.paperDimensions.width, h: this.paperDimensions.heigth });
        }

        //this.setTemporaryTreeNodes();

        return;
    }

    resizeSheet() {
        console.log(this.paperView.graph.getBBox());
        this.sheetSelected.Attrs = JSON.stringify({ w: this.paperView.graph.getBBox().width+200, h: this.paperView.graph.getBBox().height+200 });        
    }

    addSheetToViewByName(sheetName: any) {
        if(!sheetName) alert("Sheet name required")
        this.projectSheets.forEach((sheet) => {
            if (sheet.SheetName == sheetName) {
                this.addSheetToView([sheet.ID]);
                return;
            }
        })
    }

    addSheetToView(sheetId){
        let sheet = this.projectSheets.find( v=> v.ID == sheetId)
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

    addNewCheckedSheetsToView() {
        if(this.optionsChecked.length<1) {
            alert("No sheet selected")
            return;
        }
        this.optionsChecked.forEach( id => {
            this.addSheetToView(id);
        })

        this.optionsChecked = []
    }

    removeSheetFromView(sheet: Sheet) {
        this.saveBeforeLeaving(); //Save every savable thing
        
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

    clearSheetById(sheetId) {
        let sheet = this.projectSheets.find( sh => sh.ID == sheetId)
        sheet.Data = this.paperView.graph.fromJSON({
            cells: []
        })
        this.saveSheet(sheet);
        return;
    }

    clearAllProjectSheets(){
        this.projectSheets.forEach(sheet=>{
            this.clearSheetById(sheet.ID);
        })
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

    test() {
        console.log("enter press");
        this.isSheetToEdit = true;
    }

    EditSheet(sheet: Sheet) {
        if (!this.projectSelected.ID) {
            alert("No project Selected!");
            return;
        }
        if (!sheet.ID) {
            alert("No sheet Selected!");
            return;
        }
        console.log("EditSheet", sheet);
        this.sheetToEdit = new Sheet;
        if (sheet) {
            this.sheetToEdit = sheet;
        } else {
            this.sheetToEdit.ProjectID = this.projectSelected.ID;
        }
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

    projectEvent;
    previousProjectName;
    openProjectForm(event, inputFormTemplate, project: Project) {
        this.projectEvent = event.srcElement.className;
        if(project) this.previousProjectName = project.ProjectName;
        this.projectToEdit = new Project;
        if (project) {
            Object.assign(this.projectToEdit, project);
        }
        if(project != null){
            this.loadProject(project);
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

    openErrorAlert(message) {
        this.errorMessage = message;
        this.modalService.open(this.errorTemplate, {ariaLabelledBy: 'modal-basic-title', size: 'sm'}).result.then((result) => {
          //this.closeResult = `Closed with: ${result}`;
        }, (reason) => {
          //this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        });
    }
    
    openNewContactAlert() {
        this.modalService.open(this.alertContact, {ariaLabelledBy: 'modal-basic-title', size: 'sm'}).result.then((result) => {
          //this.closeResult = `Closed with: ${result}`;
        }, (reason) => {
          //this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
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
            //console.log("saveOffviewSheet: on tree change this function is called to save sheet sync ")
            //console.log(sheet.Data)
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

    updateSheet(sheet: any) {  // save sheet on db
        if (sheet.ID) { //if exists
            if (!sheet.SheetName||sheet.SheetName==""){
                alert("Sheet name is required!");
                return;
            }
            let sheetData = JSON.parse(sheet.Data);
            this.http.put < any > (urlApi + '/sheet/' + sheet.ID, sheet)
                .subscribe(
                    (any) => {
                        if (any) {
                                this.refreshSelectedSheetCB(sheet, (sh)=>{
                                    this.sheets.forEach((s)=>{
                                        if(s.ID==sh.ID){
                                            s.SheetName=sh.SheetName;
                                            this.refreshSheetOnView();
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
                                            this.refreshSheetOnView();
                                }) 

                            }
                        }

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
            //console.log("saveSheet: save sheet on db ")
            //console.log(sheet.Data)
            this.http.put < any > (urlApi + '/sheet/' + sheet.ID+querystring, sheet)
                .subscribe(
                    (any) => {
                        if (any) {
                                this.refreshSelectedSheetCB(sheet, (sh)=>{
                                    this.sheets.forEach((s)=>{
                                        if(s.ID==sh.ID){
                                            s.SheetName=sh.SheetName;
                                            this.refreshSheetOnView();
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
                                            this.refreshSheetOnView();
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
        if (this.projectEvent.includes('bi bi-pen')&&(this.previousProjectName==project.ProjectName)) return;
        if (project.ID) { //if exists
            if (!project.ProjectName||project.ProjectName==""){
                alert("Project name is required!");
                return;
            }
            let querystring="";
            if (isNameUpdate){
                querystring="?isn=yes"
            }
            //console.log("saveProject: saving project tree ")
            //console.log(this.projectSelected)
            this.http.put < any > (urlApi + '/project/' + project.ID+querystring, project)
                .subscribe(
                    (any) => {
                        if (any) {
                            alert("Project "+ project.ProjectName +" Updated!");
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
                            alert("Project "+ project.ProjectName +" Created!");
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
    addtocontacts(){
        console.log("TT");
this.PositionEmployee_listopened = false;
    }

    saveContact(contact: any, isNameUpdate?: boolean) {
        // save  project on db
    
        if (contact.id) {
          //if exists
    
          if (!contact.firstName || contact.firstName == "") {
            alert("Contact name is required!");
            return;
          }
          let querystring = "";
          if (isNameUpdate) {
            querystring = "?isn=yes";
          }
    
          let accessToken = localStorage.getItem("accessToken");
          let userId = localStorage.getItem("userId");
    
          const httpOptions = {
            headers: new HttpHeaders({
              Accept: "application/json",
              access_token: accessToken,
            }),
          };
    
          contact.firstName = contact.firstName;
    
          this.http
            .put<any>(
              GlobalService.externalApiURLSource +
                "contact/updateContact/" +
                contact.id,
              contact,
              httpOptions
            )
            .subscribe(
              (any) => {
                if (any) {
                  alert("Contact Updated!");
                  this.getContacts();
                  return;
                }
              },
              (err) => {
                if (err && err.error) {
                  if (String(err.error.error).match("UNIQUE constraint failed")) {
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
          if (!contact.firstName || contact.firstName == "") {
            alert("Contact name is required!");
            return;
          }
    
          let accessToken = localStorage.getItem("accessToken");
    
          const httpOptions = {
            headers: new HttpHeaders({
              Accept: "application/json",
              access_token: accessToken,
            }),
          };
    
          let formData = {
            firstName: contact.firstName,
          };
    
          this.http
            .post<any>(
              GlobalService.externalApiURLSource + "contact/createContact/",
              formData,
              httpOptions
            )
            .subscribe(
              (any) => {
                if (any) {
                  this.openNewContactAlert();
                  this.getContacts();
                  return;
                }
              },
              (err) => {
                if (err && err.error) {
                  if (String(err.error.error).match("UNIQUE constraint failed")) {
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
        this.panelExpanded = true;
        if (project.ID != 0) {
            this.http.delete < any > (urlApi + '/project/' + project.ID)
                .subscribe(
                    (any) => {
                        if (any) {
                            this.getProjects();
                            this.sheets = [];
                            this.projectSelected = new Project;
                            this.projectSelected.ProjectName = "Project"
                            this.projectToEdit = null;
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
    deleteContact(contact: Contact) {
        // delete project from db
        if (contact.id != 0) {
          let accessToken = localStorage.getItem("accessToken");
    
          const httpOptions = {
            headers: new HttpHeaders({
              Accept: "application/json",
              access_token: accessToken,
            }),
          };
    
          this.http
            .delete<any>(
              GlobalService.externalApiURLSource +
                "contact/deleteContact/" +
                contact.id,
              httpOptions
            )
            .subscribe(
              (any) => {
                console.log(any);
                this.getContacts();
              },
              (err) => {
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
        

        let activeNodeName = this.removeAandTfromName(activeNode.data.name);
        if (this.paperView.graph.getElements().length<=0){ // if sheet empty
            let newCell = this.paperView.memberDef(null,
                350,
                50,
                activeNodeName,
                activeNodeName,
                activeNode.data.id,
                'male.png',
                '#ffffff',
                '#797979',
                false,
                this.treeNodeCurrent
            );
            newCell.attributes.tree_id = activeNode.data.id;
            this.paperView.graph.addCell(newCell);
            this.generateGraphRecur(activeNode, newCell);
        }else{
            if(baseRoot){  // only generate/update when tree node exists on sheet
             //   console.log(baseRoot);
                this.generateGraphRecur(activeNode, baseRoot);
            } 
        }

        this.saveSheet(this.sheetSelected,false);
        this.loadSheet(this.sheetSelected);
       return; 
    }


   

    generateGraphRecur(activeNode: any, parentNew: any) { // generate sheet graph recursive from tree

        let positionType = 'position'
        if (activeNode.children.length > 0) {
            let unitX = -1;
            activeNode.children.forEach((child) => {
                if (child.data.isfunctionalrel == true) {} else {

                    let graphNode = _.find(this.paperView.graph.getElements(), (item) => { return item.attributes.tree_id ==  child.data.id })

                    if (graphNode){
                        this.generateGraphRecur(child, graphNode)

                    }else{

                        //if(child.data.id == this.tree.treeModel.focusedNode.id)
                        //    parentNew.attributes.type = 'org.Member3';
                        //else
                        //    parentNew.attributes.type = 'org.Member2';
                        let childDataName = this.removeAandTfromName(child.data.name);
                        let newCell = this.paperView.memberDef(
                            parentNew.attributes,
                            parentNew.attributes.position.x + (200 * unitX),
                            parentNew.attributes.position.y + (130),
                            childDataName,
                            childDataName,
                            child.data.id,
                            'male.png',
                            '#ffffff',
                            '#797979',
                            false,
                            this.treeNodeCurrent)
                        
                            newCell.attributes.is_advisor=false;
                            if (child.data.position.AdvisingAuthority){
                                newCell.attributes.is_advisor=true;
                        }

                        let newLink = this.paperView.getLinkDef(parentNew, newCell);

                        newCell.attributes.tree_id = child.data.id

                        this.paperView.graph.addCell(newCell);
                        this.paperView.graph.addCell(newLink);
                        unitX = unitX + 1;

                        this.generateGraphRecur(child, newCell)
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
        console.log("OnUpdateTree")
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
            //console.log("onUpdateTree: saving project tree ")
            //console.log(this.projectSelected)
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
        console.log("______________")
        let nodeCurrent = tree.treeModel.getFocusedNode();
        console.log("tree.treeModel.activeNodes: ");
        tree.treeModel.activeNodes.forEach(element => {
            console.log(element.data.name)
        });
        console.log("NodeCurrent: "+ nodeCurrent.data.name)
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

    setAandTWhenNeeded(position){
        let treeNodeName = this.removeAandTfromName(position.PositionName);

        if(position.DedicationRegime=='temporal'){
            treeNodeName = '(t) '+treeNodeName;
        }
        if(position.AdvisingAuthority){
            treeNodeName = '(a) '+treeNodeName;
        }
        return treeNodeName;
    }

    saveNamePosition(position: any, tree: any) { // when position name change in details update name on graph
        var treeNode = this.treeOrg.treeModel.getNodeBy((nodeIn) => nodeIn.data.id == position.ID);
        
        if(treeNode && treeNode.data && treeNode.data.name) treeNode.data.name = this.setAandTWhenNeeded(position);
        
        _.each(this.paperView.graph.getElements(), (item) => {
            if (item && item.attributes && item.attributes.tree_id == position.ID) {
                let opt = { width: 130, height: 45 }
                let nameWrap = joint.util.breakText(position.PositionName, opt);
                item.attr('.rank/text', nameWrap);
            }
        })
        this.savePosition(position, tree)
    }

    changeAdvisingAuthorityPosition(position: any, tree: any) { // when position Is Advisor? change in details update on graph
        console.log("changeAdvisingAuthorityPosition");
        var treeNode = this.treeOrg.treeModel.getNodeBy((nodeIn) => nodeIn.data.id == position.ID);
        if (treeNode.isRoot) {
            this.positionCurrent.AdvisingAuthority = false;
            alert("Not allowed at root level");            
            return;
        } 

        treeNode.data.name = this.setAandTWhenNeeded(position);      

        _.each(this.paperView.graph.getElements(), (item) => {
            if (item.attributes.tree_id == position.ID) {

                let opt = { width: 130, height: 45 }
                let nameWrap = joint.util.breakText(position.PositionName, opt);
                item.attr('.rank/text', nameWrap);
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
                   console.log('advising true');    
                  item.attributes.is_advisor = true;
                }else{
                   if (inboundLink&&inboundLink[0]){
                       inboundLink[0].router({
                            name: 'manhattan',
                            args: {
                                padding: 10,
                                startDirections: ['right', 'bottom', 'left'],
                                endDirections:  ['top']
                            }
                        });
                   }  
                   console.log('advising false');
                   item.attributes.is_advisor = false;
                }
            }
        })
        this.savePosition(position, tree)
        this.saveSheet(this.sheetSelected);
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

    savePositionAndExpandPanel(position: any, tree: any){
        if(!this.panelExpanded) {
            this.savePosition(position,tree);
            this.panelExpanded = true;
        }         
    }

    savePosition(position: any, tree: any) {  // save position (node)
        let treeNodeCurrent;
        if(position && position.ID) treeNodeCurrent = this.treeOrg.treeModel.getNodeById(position.ID)
        if(treeNodeCurrent) {
            treeNodeCurrent.data.position = this.positionCurrent;
            if(this.treeNodeCurrent.data.attachments){
                treeNodeCurrent.data.attachment = this.treeNodeCurrent.data.attachments
                treeNodeCurrent.data.attachments = this.treeNodeCurrent.data.attachments
            }     
            if(this.treeNodeCurrent.data.functionalrels) treeNodeCurrent.data.functionalrels = this.treeNodeCurrent.data.functionalrels 
        }
        
        this.nodes = tree.treeModel.nodes;
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
        //console.log("Save Position: saving project tree")
        //console.log(this.projectSelected)
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
                    if (any) {
                        this.getActiveSheetShapesDefaults();
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

    refreshProjectSelectedSheets(cb) { // refresh selected project  sheets
        let i = 0;
        let newProjectSheets: any = [];
        if (this.sheetSelected && this.projectSheets.length > 0) {
            this.projectSheets.forEach((sheet) => {
                if (this.sheetSelected && (sheet.ID == this.sheetSelected.ID)) {
                    newProjectSheets.push(this.sheetSelected);
                    console.log("this.sheetSelected");
                } else {
                    newProjectSheets.push(sheet)
                    console.log("sheet index");
                }
                if (i >= this.projectSheets.length - 1) {
                    cb(newProjectSheets)
                }
                i = i + 1;
            })
        }
    }


    nodesToDeleteData: any = []
    checkBeforeDeleteTreeNodes(tree: any, cb) {  // check before delete node
        if (!tree.treeModel.getActiveNode()) {
            return;
        }

        this.nodesToDeleteData = [];
        tree.treeModel.activeNodes.forEach(element => {
            this.nodesToDeleteData.push(element);
            
            this.refreshProjectSelectedSheets((projectSheets) => {
                this.paperView.beforeDeleteNodeAllSheets(element, projectSheets);
            })
            cb()
        });        
        
    }

    openConfirmDeleteTreeNodes(event: any, confirmDeleteTreeNodeTemplate: any, tree: any) { // modal confirm delete node
        if (!tree.treeModel.getActiveNode()) {
            return;
        }
        event.preventDefault();
        this.tree = tree;
        this.checkBeforeDeleteTreeNodes(tree, () => {
            if(!this.modalService.hasOpenModals()){ //This check is made because the event triggers once per nodeToDelete, so, we open the modal only once
                this.modalWindow = this.modalService.open(confirmDeleteTreeNodeTemplate, {
                    ariaLabelledBy: 'modal-basic-title',
                    size: 'sm',
                    scrollable: false
                });
            }            

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

    deleteNodesConfirmedByUser(tree, flag = false){
        console.log(flag);
        let activeNode = tree.treeModel.getActiveNode();
        if (!activeNode) {
            alert('No active or selected Node!')
            return;
        }

        let rootNode = tree.treeModel.getFirstRoot();
        if(rootNode.isActive) {
            this.clearAllProjectSheets();
        } 
        this.deleteNodes(tree, flag);

        //Wait 500ms, enough for confirmDeleteTreeNodeTemplate to modal.dismiss
        setTimeout(function(){ alert("Succesfully deleted selected node(s) and below relations."); }, 500);
    }

    deleteNodeFunctionalRels(node, tree){
        if (node.data.isfunctionalrel && node.data.isfunctionalrel == true) {
            this.deleteFunctionalRelById({
                id: node.data.functionalRelTargetId,
                idSource: node.data.functionalRelSourceId
            }, tree)
        }
        this.delFunctionalRelsOtherNodes(tree, node);
        return
    }

    removeNodeFromParentsChildrenData(node){
        let parentNode = node.realParent ? node.realParent : node.treeModel.virtualRoot;
        _.remove(parentNode.data.children, (child: any) => {
            return child === node.data;
        });
        return
    }

    deleteActiveNodeFromTree(tree, flag){
        
        this.positionCurrent= new Position;
        let node = tree.treeModel.getActiveNode();
        console.log(flag);    
        if (flag) {
            this.deleteNodeFunctionalRels(node, tree);
            this.removeNodeFromParentsChildrenData(node);
        }



        //new, delete node on all sheets 
        this.refreshProjectSelectedSheets((projectSheets) => {
            this.paperView.deleteNodeAllSheets(node, projectSheets);
        })
        tree.treeModel.update();
        this.onUpdateTree(null, tree);
        return
    }

    deleteNodes(tree, flag=false) {  // delete tree node 
        
        tree.treeModel.activeNodes.forEach(element => {
            console.log("Node to Delete: ");
            console.log(element.data);
            this.deleteActiveNodeFromTree(tree, flag);
        });
        this.panelExpanded = true;
    }

    checkAndUpdateTreeNodeAddedAllSheets(parent: any, newNodeName: any, newNodeId: any) { //executed only when node is not root 
        this.projectSheets.forEach((sheet) => {
            if (sheet.Data != "") {

                let cells = JSON.parse(sheet.Data);
                cells.cells.forEach((cell) => {
                    if (cell.type != "org.Arrow") {
                        if (cell.attrs[".rank"].text == parent.data.name) {
                            let newCell = this.paperView.memberDef(
                                cell,
                                cell.position.x + (200),
                                cell.position.y + (130),
                                newNodeName,
                                newNodeName,
                                newNodeId,
                                'male.png',
                                '#ffffff',
                                '#797979',
                                false,
                                this.treeNodeCurrent
                            )
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

    removeAandTfromName(name){
        name = name.replace('(a) ','')
        
        return name.replace('(t) ','');
    }

    addNode(tree: any, nodeName: any, nodePositionCode: any) {  // add tree node
        console.log("addNode");
        if (nodeName == undefined || nodeName == '') {
            nodeName = 'New Node';
        }
        let nodePosition: Position = new Position;
        let parent: any;
        nodePosition.PositionName = nodeName;
        nodePosition.PositionCode = nodePositionCode;
        nodePosition.DedicationRegime = 'position';
        if (tree.treeModel.nodes.length > 0) {
            parent = tree.treeModel.getActiveNode();

            nodePosition.PositionInmediateSuperior = this.removeAandTfromName(parent.data.name);
            parent.data.children.push({
                name: nodeName,
                position: nodePosition,
                children: []
            });


            setTimeout(() => {
                let parentRefresh = tree.treeModel.getNodeById(parent.id);
                parentRefresh.getLastChild().setActiveAndVisible();
                console.log(parentRefresh.getLastChild());
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

    treeNodesSameLevelUp(tree: any) {
        this.findNonSelectedPreviousSibling(tree);
    }

    findNonSelectedPreviousSibling(tree){
        let previousSibling: any;
        let parentNode: any;

        let node = tree.treeModel.getActiveNode();
        if(!node) {
            alert('No active or selected Node!')
            return;
        }
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        } 

        console.log("Iteration: start seeking")
        tree.treeModel.activeNodes.forEach(node => {                      

            node = tree.treeModel.getNodeById(node.id);
            previousSibling = node.findPreviousSibling();
            if (!previousSibling) {
                alert('No Previous Sibling available!');
                return;
            }
            //If previousSibling is not among the selectedNodes
            let isAmongSelected = this.siblingIsAmongSelectedNodes(tree, previousSibling);
            if(!isAmongSelected) {
                console.log("Sibling is not selected, SWITCH")
                //Calculate parent Node
                parentNode = node.realParent ? node.realParent : node.treeModel.virtualRoot;
                console.log("Non selected previous sibling is: " + previousSibling.data.name);
                //Execute same level up on all selected nodes
                this.moveSameLevelUp(tree, previousSibling, parentNode);
            } else {
                //And if it is, try again because this one is selected       
                console.log("Sibling is among selected nodes, iterate");
            } 
            
        });

        
    }

    moveSameLevelUp(tree, previousSibling, parentNode){    
         
        let node = previousSibling.findNextSibling();       
        tree.treeModel.moveNode(node, {
            dropOnNode: false,
            index: previousSibling.index,
            parent: parentNode
        }, {
            index: 0,
            parent: parentNode
        })  

    }

    moveSameLevelDown(tree, nextSibling, parentNode){
        
        let node = nextSibling.findPreviousSibling();   
        tree.treeModel.moveNode(nextSibling, {
            dropOnNode: false,
            index: node.index,
            parent: parentNode
        }, {
            index: 0,
            parent: parentNode
        })
       
    }

    treeNodesSameLevelDown(tree: any) {
        this.findNonSelectedNextSibling(tree);
    }

    siblingIsAmongSelectedNodes(tree, sibling){
        let isAmongTheSelectedNodes = false;
            tree.treeModel.activeNodes.forEach(item => {                
                //Check if nextSibling is among the selectedNodes
                if( sibling == item ) isAmongTheSelectedNodes = true
            });
        return isAmongTheSelectedNodes;
    }

    findNonSelectedNextSibling(tree){
        let nextSibling: any;
        let parentNode: any;
        
        let node = tree.treeModel.getActiveNode()
        if(!node) {
            alert('No active or selected Node!')
            return;
        }
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }   

        console.log("Iteration: start seeking")
        
        tree.treeModel.activeNodes.forEach(node => {     
            node = tree.treeModel.getNodeById(node.id);
            nextSibling = node.findNextSibling();
            if (!nextSibling) {
                alert('No Next Sibling available!');
                return;
            }
            //If nextSibling is among the selectedNodes
            let isAmongSelected = this.siblingIsAmongSelectedNodes(tree, nextSibling);
            if(!isAmongSelected) {
                console.log("Sibling is not selected, SWITCH");
                //Calculate parent Node
                parentNode = node.realParent ? node.realParent : node.treeModel.virtualRoot;
                console.log("Non selected next sibling is: " + nextSibling.data.name);
                //Execute same level up on all selected nodes
                this.moveSameLevelDown(tree, nextSibling, parentNode);
            } else {
                //And if it is, try again because this one is selected       
                console.log("Sibling is among selected nodes, iterate");
            }
            
        });

        
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

        let parentNode: any;
        let previousSibling: any;
        let done = false;

        console.log("Iteration: start seeking")
        tree.treeModel.activeNodes.forEach(node => {                      
            if(!done){
                node = tree.treeModel.getNodeById(node.id);
                previousSibling = node.findPreviousSibling();
                if (!previousSibling) {
                    alert('No Previous Sibling available!');
                    return;
                }
                //If previousSibling is not among the selectedNodes
                let isAmongSelected = this.siblingIsAmongSelectedNodes(tree, previousSibling);
                if(!isAmongSelected) {
                    console.log("Sibling is not selected, SWITCH")
                    //Calculate parent Node
                    parentNode = node.realParent ? node.realParent : node.treeModel.virtualRoot;
                    console.log("Non selected previous sibling is: " + previousSibling.data.name);
                    //Execute same level up on all selected nodes
                    this.moveNodesOneLevelDown(tree, previousSibling, parentNode);
                    done = true;
                } else {
                    //And if it is, try again because this one is selected       
                    console.log("Sibling is among selected nodes, iterate");
                } 
            }           
            
        });

    }

    moveNodesOneLevelDown(tree, previousSibling, parentNode) {    
        tree.treeModel.activeNodes.forEach(element => {
            let currNode = tree.treeModel.getNodeById(element.id);
            tree.treeModel.moveNode(currNode, {
                dropOnNode: false,
                index: 0,
                parent: previousSibling
            }, {
                index: 0,
                parent: parentNode
            })
        });

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

        tree.treeModel.activeNodes.forEach(element => {
            let currNode = tree.treeModel.getNodeById(element.id);
            tree.treeModel.moveNode(currNode, {
                dropOnNode: false,
                index: parentNode.index,
                parent: grandParentNode
            }, {
                index: 0,
                parent: parentNode
            })
        });        

    }

    circleAddNodeNorth(tree: any, event: any) {
        //Cick en el circulo dispara al componente valores para abrir el popup
        this.selectNodeComponent.open(event.event.clientX, event.event.clientY, 'NORTH');
        return;
    }

    circleAddNodeEast(tree: any, event: any) {
        //Cick en el circulo dispara al componente valores para abrir el popup
        this.selectNodeComponent.open(event.event.clientX, event.event.clientY, 'EAST');
        return;
    }

    circleAddNodeSouth(tree: any, event: any) {
        //Cick en el circulo dispara al componente valores para abrir el popup
        this.selectNodeComponent.open(event.event.clientX, event.event.clientY, 'SOUTH');
        return;
    }

    circleAddNodeWest(tree: any, event: any) {
        //Cick en el circulo dispara al componente valores para abrir el popup
        this.selectNodeComponent.open(event.event.clientX, event.event.clientY, 'WEST');
        return;
    }

    circleCreateNode(event: any) {
        if (event.cardinal == 'NORTH' || event.cardinal == 'SOUTH') {
            this.paperView.addGraphNode(this.paperView.nodeGraphCurrent, event.left, event.top, 'Child', '', event.type, null);
            this.selectNodeComponent.close();
            this.onUpdateTree(null, this.treeOrg);
        }
        else {
            let siblingSide = 'right';
            if (event.cardinal == 'WEST')
                siblingSide = 'left';
            this.paperView.addGraphNodeSibling(this.paperView.nodeGraphCurrent, event.left, event.top, 'Child', '', event.type, siblingSide,  null);
            this.selectNodeComponent.close();
            this.onUpdateTree(null, this.treeOrg);
        }
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

    moveUpNode(tree: any) {
        if (!tree.treeModel.getActiveNode()) {
            alert('No active or selected Node!')
            return;
        }
        let node: any = tree.treeModel.getActiveNode();
        if (node.isRoot == true) {
            alert("No allowed at root level");
            return;
        }

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
        if (node.data.children.length == 0 && node.data.name == '**Displacement**') {
            node = tree.treeModel.getNodeById(node.id);
            this.deleteNodes(tree, true);
        } else {
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
                if (c >= node.data.children.length - 1 || node.data.name == '**Displacement**') {
                    node = tree.treeModel.getNodeById(node.id);
                    // node.setActiveAndVisible();
                    this.deleteNodes(tree, true);
                }

                i = i + 1
                c = c + 1
            })
        }
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

            nodePosition.PositionInmediateSuperior = this.removeAandTfromName(parent.data.name);
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
                                    color: 'rgba(255,255,255,1)',
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
                            this.saveActiveSheetShapesDefaults();
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
        console.log(treeNode);
        if (treeNode) {
            if(treeNode.data.name.includes('(a)')&&treeNode.data.name.includes('(t)')) treeNode.data.name = '(a) (t) ' + event.name;
            if(treeNode.data.name.includes('(a)')&&!treeNode.data.name.includes('(t)')) treeNode.data.name = '(a) ' + event.name;
            if((!treeNode.data.name.includes('(a)'))&&treeNode.data.name.includes('(t)')) treeNode.data.name = '(t) ' + event.name;
            treeNode.data.position.PositionName = this.removeAandTfromName(event.name);
        }
        this.positionCurrent = treeNode.data.position;
        
        //this.savePosition(this.positionCurrent, this.treeOrg);
        //this.saveSheet(this.sheetSelected);
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
                    nodePosition.PositionInmediateSuperior = this.removeAandTfromName(treeNodeParent.data.name);
                    nodePosition.DedicationRegime='position';
                    if (gEl.attributes.position_type=="temporal"){                   
                         nodePosition.DedicationRegime='temporal';
                    }
                                                      
                    nodePosition.AdvisingAuthority=gEl.attributes.is_advisor;

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
                            if(gEl.attributes.is_advisor) newTreeNode.data.name = '(a) '+newTreeNode.data.name

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
        let parts = attachment.name.split('.')
        let extension = parts[parts.length - 1];
        let className = ""
        switch (extension.toLowerCase()) {
            case 'doc':
            case 'docx':
                className = "bi bi-file-earmark-word" 
                break;
            case 'xlsx':
                className = "bi bi-file-earmark-spreadsheet" 
                break;               
            case 'jpg':
            case 'gif':
            case 'bmp':
            case 'png':
            case 'jpeg':
                className = "bi bi-file-earmark-image" 
                break;
            case 'm4v':
            case 'avi':
            case 'mpg':
            case 'mp4':
                className = "bi bi-film" 
                break;
            case 'pdf':
                className = "bi bi-file-earmark-pdf" 
                break;
            case 'pptx':
            case 'ppt':
                className = "bi bi-file-earmark-ppt" 
                break;
              //etc
            default : className = "bi bi-files" 
          }
        if (this.attachmentsHash[attachment.name]) { 
            return //
        } //
        this.attachmentsHash[attachment.name] = true //
        this.treeNodeCurrent.data.attachments.push({
            name: attachment.name,
            class: className
        });
        this.treeNodeCurrent.data.attachments.sort((a,b) => (a.name.slice(11).toLowerCase() > b.name.slice(11).toLowerCase()) ? 1 : ((b.name.slice(11).toLowerCase() > a.name.slice(11).toLowerCase()) ? -1 : 0))
        console.log(this.treeNodeCurrent.data.attachments)
        this.onUpdateTree(null, this.treeOrg);
    }


    deleteAttachment() { // delete position attachements
        this.attachmentsHash[this.attachmentToDelete.name] = false //
        _.remove(this.treeNodeCurrent.data.attachments, (item) => {
            return item === this.attachmentToDelete
        })
        
        this.savePosition(this.positionCurrent, this.treeOrg);
        this.attachmentToDelete = {}
    }

    attachmentToDelete: any = {};
    openConfirmDeleteAttachment(event: any, attachment: any, confirmDeleteAttachmentTemplate: any) { // modal confirm delete node
        this.attachmentToDelete = attachment;

        if (!attachment) {
            return;
        }
        event.preventDefault();
        
        if(!this.modalService.hasOpenModals()){ //This check is made because the event triggers once per nodeToDelete, so, we open the modal only once
            this.modalWindow = this.modalService.open(confirmDeleteAttachmentTemplate, {
                ariaLabelledBy: 'modal-basic-title',
                size: 'sm',
                scrollable: false
            });
        }   

    }

    fileToUpload: File [] = [];
    handleFileInput(files: FileList) {
        this.fileToUpload = []
        // this.fileToUpload = files.item(0);
        for (var i = 0; i < files.length; i++) { 
            this.fileToUpload.push(files.item(i));
        }
    }



    checkForAttachmentExistingName(newAttachment: any, cb: any) {
        let value = false;
        if (this.treeNodeCurrent.data && this.treeNodeCurrent.data.attachments) {
          if (this.treeNodeCurrent.data.attachments.length <= 0) {
            cb(false);
            return;
          }
    
          this.treeNodeCurrent.data.attachments.forEach((attachment, i) => {
            if (
              newAttachment.name ==
              attachment.name.substr(11, attachment.name.length - 1)
            ) {
              value = true;
            }
          });
          if (value) {
            cb(true);
            return;
          } else {
            cb(false);
            return;
          }
        } else {
          cb(false);
          return;
        }
      }
    
      postFile(recordToEdit: any, fileToUpload: File[], tree: any) {
        // upload attachment
        console.log(fileToUpload);
    
        console.log(fileToUpload.length);
    
        let alreadyExist: any[] = [];
    
        for (var i = 0; i < fileToUpload.length; i++) {
          this.checkForAttachmentExistingName(fileToUpload[i], (isNameExist) => {
            if (isNameExist) {
              alert("File name " + fileToUpload[i].name + " already exists! ");
            } else {
              console.log("Ffffffffff");
              const formData: FormData = new FormData();
              formData.append("upload", fileToUpload[i], fileToUpload[i].name);
              this.http.post<any>(urlApi + "/upload-file", formData).subscribe(
                (any) => {
                  if (any) {
                    this.modalWindow.close();
                    if (any && any.file != "/files/nofile") {
                      console.log(any.file);
                      this.addAttachment({
                        name: any.file,
                      });
                      this.savePosition(this.positionCurrent, tree);
                    }
                    return;
                  }
                },
                (err) => {
                  alert(err);
                  return;
                }
              );
            }
          });
        }
    
        // formData.append('upload', fileToUpload, fileToUpload.name);
        return;
      }
      fileNameSub(fileName: any) {
        return fileName.substr(11, fileName.length - 1);
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
        //console.log("Seleccionado " + node.data.name + " como el nodo padre");
        
        let nodeCurrent = this.treeOrg.treeModel.getNodeBy((item) => { return this.treeNodeCurrent.data.id == item.data.id })
        //console.log("El nodo hijo de ese padre es:");
        //console.log(nodeCurrent.data);

        if(node.data.name == nodeCurrent.data.name){
            alert("Position " + nodeCurrent.data.name + " can't be immediate superior for himself");
            modal.close()
            return;
        }
        
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
            this.positionCurrent.PositionInmediateSuperior = this.removeAandTfromName(node.data.name);
            this.treeOrg.treeModel.update();
            this.onUpdateTree(null, this.treeOrg);
            setTimeout(() => { this.updateAllSheetsFromTreeNode(); }, 300)
        }
        modal.close()
        return;
    }

    selectedFuncRels: any = [];
    onNodeSelectFunctionRel($event, tree: any, modal: any) { //set functional rel
        console.log(this.selectedFuncRels);
        // console.log('Active Nodes inside the method: ')
        // this.selectedFuncRels.forEach((functionalRel)=>{
        //     console.log(functionalRel.data.name);
        //     let functionalRelNode = this.treeOrg.treeModel.getNodeById(functionalRel.data.id)
        //     console.log("Functional Relation Node: ")
        //     console.log(functionalRelNode.data.name)
        //     this.addFunctionalRel(functionalRel, this.treeOrg); 
        // }) 

        // setTimeout(() => { 
        //     this.selectedFuncRels = [];//Restablecer selectedFuncRels
        // }, 300)
        // this.saveSheet(this.sheetSelected);
        // modal.close()
        
        // return;
    }

    updateTreeNodeCurrentFunctionalRelHash(){
        this.functionalrelsHash = {}
        this.treeNodeCurrent.data.functionalrels.forEach((item) => {
            this.functionalrelsHash[item.id] = true;
        })
    }

    openAddFunctionalRel(event, template) {  // open functional rel modal
        this.updateTreeNodeCurrentFunctionalRelHash();
        event.preventDefault();
        this.modalWindow = this.modalService.open(template, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });

    }

    functionalrelsHash = {}
  


    refreshSheetOnView() {
        if (this.activeSheets[this.activeId]) {
            this.loadSheetByID(this.activeId);
        }
    }

    parentWithFunctionalRelToDelete: any = {};
    openConfirmDeleteFuncRel(event: any, functionalrel: any, confirmDeleteFuncRelTemplate: any) { // modal confirm delete node
        this.parentWithFunctionalRelToDelete = functionalrel;        
        
        if (!functionalrel) {
            return;
        }
        event.preventDefault();
        
        if(!this.modalService.hasOpenModals()){ //This check is made because the event triggers once per nodeToDelete, so, we open the modal only once
            this.modalWindow = this.modalService.open(confirmDeleteFuncRelTemplate, {
                ariaLabelledBy: 'modal-basic-title',
                size: 'sm',
                scrollable: false
            });
        }   

    }

    removeLinkFromSheet(fToDelete){
        console.log("Delete functional relation link: ")
        if (this.sheetSelected.ID != 0) {
            //Encontrar el nodo en el lienzo que representa al link
            let cells = JSON.parse(this.sheetSelected.Data);

             let source = _.find(cells.cells, (cell) => { 
                return fToDelete.functionalRelSourceId == cell.tree_id;
            })
           
            let target = _.find(cells.cells, (cell) => { 
                return fToDelete.functionalRelTargetId == cell.tree_id;
            })

            _.each(cells.cells, (cell) => { 
                if(cell&&cell.type&&cell.type=='org.Arrow'){
                    if(cell.source.id==source.id&&cell.target.id==target.id) {
                        _.remove(cells.cells, cell);
                    }
                }
            })

            this.saveSheet(this.sheetSelected);
        }
    }

    deleteFunctionalRel() { 
        let fToDelete;

        console.log("Functional Relation object to delete: ")
        console.log(this.parentWithFunctionalRelToDelete)

        //this.functionalrelsHash[this.parentWithFunctionalRelToDelete.id] = false 
        let treeNodeParentWithFunctionalRelToDelete = this.treeOrg.treeModel.getNodeById(this.parentWithFunctionalRelToDelete.id);
        if (!treeNodeParentWithFunctionalRelToDelete) {
            alert("Not found functional relationship...")
            return;
        }    
        console.log("Eraser Node of functional relation: ")
        console.log(this.treeNodeCurrent)
        
        treeNodeParentWithFunctionalRelToDelete.data.children.forEach(child => {
            if(child.functionalRelTargetId==this.treeNodeCurrent.data.id) fToDelete = child;
        });
        console.log("(f) to delete: ")
        console.log(fToDelete)

        if(fToDelete) this.deleteNodeById(this.treeOrg, fToDelete);
        // else {
        //     alert("Not found tree node <(f) "+ this.treeNodeCurrent.data.name + "> among "+ treeNodeParentWithFunctionalRelToDelete.data.name +"'s children")
        // }                
        
        console.log("Relaciones funcionales de: "+ this.treeNodeCurrent.data.name )
        console.log( this.treeNodeCurrent.data.functionalrels )

        _.remove(this.treeNodeCurrent.data.functionalrels, (item) => {
            return item === this.parentWithFunctionalRelToDelete
        })

        if(fToDelete) this.removeLinkFromSheet(fToDelete);

        this.savePosition(this.positionCurrent, this.treeOrg);


        if (this.sheetSelected.ID != 0) {
            setTimeout(() => { 
                this.updateAllSheetsFromTreeNode();  
                this.refreshSheetOnView(); 
            }, 200)
        }
        setTimeout(() => { 
            alert("Succesfully deleted functional relationship.")
        }, 1000)
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
            let fToDelete = {
                functionalRelSourceId: functionalRelTarget.idSource,
                functionalRelTargetId: functionalRelTarget.id
            }
            this.removeLinkFromSheet(fToDelete);

            if (this.sheetSelected.ID != 0) {
                setTimeout(() => { 
                    this.updateAllSheetsFromTreeNode();  
                    this.refreshSheetOnView(); 
                }, 200)
            }
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
        if(!this.projectSheets) return

        console.log("updateAllSheetsFromTreeNode")
        this.treeOrg.treeModel.update();
        let root = this.treeOrg.treeModel.getFirstRoot()
        this.updateNodesTreesParent(root.data);  // update parents if changed
        //setTimeout(() => { this.onUpdateTree(null, this.treeOrg); }, 1000)
        //Si va a esperar un segundo a que termine de actualizar los parents, mejor llama el metodo desde el final de aquel metodo, y no introduzcas ninguna espera.

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
                        let treeNodeRootForSheetDataName = this.removeAandTfromName(treeNodeRootForSheet.data.name);
                        let newCell = this.paperView.memberDef(
                            null,
                            (350),
                            (50),
                            treeNodeRootForSheetDataName,
                            treeNodeRootForSheetDataName,
                            treeNodeRootForSheet.data.id,
                            'male.png',
                            '#ffffff',
                            '#797979',
                            false,
                            this.treeNodeCurrent
                        )
                        let cCellAttributes = this.getCurrentCellAttributes(cells, treeNodeRootForSheet.data.id);
                        if(cCellAttributes) newCell.attributes = cCellAttributes;
                        newCell.attributes.tree_id = treeNodeRootForSheet.data.id;
                        newCells.cells.push(newCell.attributes);
                        sheet.Data = JSON.stringify(newCells);
                        this.generateSheetDataRecur(treeNodeRootForSheet, newCell.attributes, newCells, sheet, cells);
                    } //  if treeNodeRootForSheet
                } //  if rootSheetNode
                this.refreshSheetOnView();
            }
        })
    }

    getCurrentCellAttributes(cells, id){
        let currentCellAttributes = _.find(cells.cells, cell => {
            return (cell && cell.tree_id && cell.tree_id == id)
        })
        return currentCellAttributes;
    }

    updateNodesTreesParent(activeNode: any) {
        if (activeNode.children&&activeNode.children.length > 0) {
            activeNode.children.forEach((child) => {
                    child.position.PositionInmediateSuperior = this.removeAandTfromName(activeNode.name);
                    this.treeOrg.treeModel.update();
                    this.updateNodesTreesParent(child);
           })
        }
        this.onUpdateTree(null, this.treeOrg);
    }

    generateSheetDataRecur(activeNode: any, parentNew: any, cells: any, sheet: any, oldCells) {
        console.log("Generate sheet data recur")
        let positionType = 'position'
        if (activeNode.children.length > 0) {
            let unitX = -1;
            activeNode.children.forEach((child) => {
                if (child.data.isfunctionalrel == true) {} else {
                    let childDataName = this.removeAandTfromName(child.data.name);
                    let newCell = this.paperView.memberDef(
                        parentNew,
                        parentNew.position.x + (200 * unitX),
                        parentNew.position.y + (130),
                        childDataName,
                        childDataName,
                        child.data.id,
                        'male.png',
                        '#ffffff',
                        '#797979',
                        false,
                        this.treeNodeCurrent
                    );
                    let cCellAttributes = this.getCurrentCellAttributes(oldCells, child.data.id);
                    if(cCellAttributes) newCell.attributes.attrs = cCellAttributes.attrs;
                    newCell.attributes.tree_id = child.data.id;
                    cells.cells.push(newCell.attributes);
                    let newLink = this.paperView.getLinkDef(parentNew, newCell, child.data.is_displacement);
                    cells.cells.push(newLink.attributes);
                    sheet.Data = JSON.stringify(cells);
                    unitX = unitX + 1;
                    this.generateSheetDataRecur(child, newCell.attributes, cells, sheet, oldCells)
                }


            })
        }
    }
    updateCheckedOptions(id) {
        const index = this.optionsChecked.indexOf(id);
        if (index > -1) {
            this.optionsChecked.splice(index, 1);
        } else {
            this.optionsChecked.push(id)
        }
        
        console.log(this.optionsChecked)
    }
    addFunctionalRel(functionalrel: any, tree: any) { //
        if (this.positionCurrent.ID == functionalrel.data.id) {
            alert("Not Allowed to create Functional Relationship with self")
            return
        }
        let nodeCurrent = tree.treeModel.getNodeById(this.positionCurrent.ID);

        if (functionalrel.data.id == nodeCurrent.parent.id) {
            alert("Functional Relationship not allowed on same parent")
            return
        }

        if (functionalrel.level >= nodeCurrent.level) {
            console.log(functionalrel.level + "    " + nodeCurrent.level)
            alert("Functional Relationship only allowed on upper levels")
            return
        }
        if (this.functionalrelsHash[functionalrel.data.id]) { 
            alert("Functional Relationship: <" + functionalrel.data.name + "> already exists")
            return 
        } 
        this.functionalrelsHash[functionalrel.data.id] = true 
        this.treeNodeCurrent.data.functionalrels.push({
            name: functionalrel.data.name,
            id: functionalrel.data.id
        });
        //console.log("this.treeNodeCurrent.data.functionalrels");
        //console.log(this.treeNodeCurrent.data.functionalrels);
        nodeCurrent.data.functionalrels = this.treeNodeCurrent.data.functionalrels;
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

    onChangeEvent(event) {
        this.panelExpanded=this.panelExpanded == false ? true: false;
    }

    onSearchContacts(n){

        this.contactsSearch = this.contacts;

        this.contactsSearch = this.contactsSearch.filter((item) => {
      
            return (
              item.firstName.toLowerCase().indexOf(n) >
              -1
            );
          });


    }

    selectdataClk(n){
        console.log(n);
this.selectedDataValue = n.id;
    }
    addToContactClk(){
        this.PositionEmployee_listopened = true;
    }
    
}