import { Component, Input, ViewChild, ElementRef, OnInit, HostListener, AfterViewInit, ViewContainerRef, TemplateRef } from '@angular/core';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { fromEvent, Subscription } from 'rxjs';
import { take, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import * as joint from 'jointjs';
import * as _ from 'lodash'
import { Position } from '../models/position';
import { Sheet } from '../models/sheet';
import { EventEmitter, Output } from '@angular/core';
import { CdkDragDrop, CdkDrag } from '@angular/cdk/drag-drop';
import { Contact } from '../models/contact';
import { ContactRight } from '../models/contactright';

@Component({
    selector: 'app-joint',
    templateUrl: './joint.component.html',
    styleUrls: ['./joint.component.css'],

})
export class JointComponent implements OnInit, AfterViewInit {
    @Output() clickPaperBlankAreaEvent = new EventEmitter < Position > ();    //graph position is clicked
    @Output() dblclickGraphNodeEvent = new EventEmitter < Position > ();    //graph position is clicked
    @Output() clickGraphNodeEvent = new EventEmitter < Position > ();    //graph position is clicked
    @Output() refreshSelectedSheetEvent = new EventEmitter < Sheet > ();  //send refresh sheet to main
    @Output() sheetDimentionsChangeEvent = new EventEmitter(); //sheet dimentions change event
    @Output() nodeGraphNameChangeEvent = new EventEmitter();  // change name graph node
    @Output() graphNodeAddedEvent = new EventEmitter(); // graph node elemente added 
    @Output() mouseDownGraphNodeEvent = new EventEmitter(); // used to fire on circle actions

    @ViewChild('paper') paperElement: ElementRef;
    @ViewChild('cellMenu') cellMenu: TemplateRef < any > ;
    overlayRef: OverlayRef | null;
    sub: Subscription;
    @ViewChild('paperMenu') paperMenu: TemplateRef < any > ;
    overlayRef2: OverlayRef | null;
    sub2: Subscription;
    urlApi: any;

    paper: any;
    timer: any = null;
    graph: any;
    scale: number = 1;
    positionCurrent = new Position;
    nodeGraphCurrent: any;
    nodeGraphAnyLastSelected: any;
    searchGraphNodesResult: any = [];
    searchGraphNodesResultIndex: any = 0;
    modal: any;
    modalWindow: NgbModalRef;
    newNodeCode: any;
    newNodeName: any;
    positionType: any = "position";
    isAdvisor: any = false;
    unitX: number = 0;
    unitY: number = 1;
    childrenLayout: any = 2;
    isDeleteCellConfirm = false;
    currentXPaperContextMenu: any;
    currentYPaperContextMenu: any;
    active2: any = 1;
    shapeProperties: any = {  //  shape extra properties
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
    paperMouseOverXY: any = {
        x: 0,
        y: 0
    }

    tree: any;
    contacts: Contact[] = [{ ID: 1, Name: 'contact1' }, { ID: 2, Name: 'contact2' }, { ID: 3, Name: 'contact3' }, { ID: 4, Name: 'contact4' }]

    c1 = '<circle class="c1" style="fill:#3cd039 ;stroke:#3cd039;stroke-width:1;stroke-miterlimit:10;filter: drop-shadow( 2px 2px 2px rgba(119, 255, 51, .7));" r="10">' +
        '</circle>';
    c2 = '<circle class="c2" style="fill:#ee9f06 ;stroke:#ee9f06;stroke-width:1;stroke-miterlimit:10;filter: drop-shadow( 2px 2px 2px rgba(255, 202, 51, .7));" r="10">' +
        '</circle>';
    c3 = '<circle class="c3" style="fill:#3977d4 ;stroke:#3977d4;stroke-width:1;stroke-miterlimit:10;filter: drop-shadow( 2px 2px 2px rgba(51, 178, 255, .7));" r="10">' +
        '</circle>';

    // custom jointjs element for positions    
    Member2 = joint.dia.Element.define('org.Member2', {
        size: { width: 180, height: 70 },
        attrs: {
            rect: { width: 170, height: 60 },
            '.card': { fill: '#FFFFFF', stroke: '#000000', 'stroke-width': 2, 'pointer-events': 'visiblePainted', rx: 10, ry: 10 },
            '.rank': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.5, 'ref-y': 0.2, 'font-family': 'Courier New', 'font-size': 14, 'font-weight': 900, 'text-anchor': 'middle', 'vertical-alligment': 'middle', 'text-direction': 'horizontal' },
            '.c1': { ref: '.card', 'ref-x': 0.33, 'ref-y': 0.76, },
            '.c2': { ref: '.card', 'ref-x': 0.48, 'ref-y': 0.76, },
            '.c3': { ref: '.card', 'ref-x': 0.63, 'ref-y': 0.76, },
            '.n1': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.35, 'ref-y': 0.7, 'font-family': 'Courier New', 'font-size': 14, 'text-anchor': 'end' },
            '.n2': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.5, 'ref-y': 0.7, 'font-family': 'Courier New', 'font-size': 14, 'text-anchor': 'end' },
            '.n3': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.65, 'ref-y': 0.7, 'font-family': 'Courier New', 'font-size': 14, 'text-anchor': 'end' },
        },
        "org_parent": '',
        "org_parent_id": '',
        "org_level": 0,
        "n1": 0,
        "n2": 0,
        "n3": 0,
        "is_advisor": false,
        "position_type": 'position',
        "tree_id": 0,
    }, {
        markup: '<g class="rotatable"><g class="scalable"><rect class="card"/></g><text class="rank"/>' + this.c1 + '<text class="n1"/>' + this.c2 + '<text class="n2"/>' + this.c3 + '<text class="n3"/></g>',
    });

    Member3 = joint.dia.Element.define('org.Member3', {
        size: { width: 245, height: 105 },
        attrs: {
            rect: { width: 170, height: 60 },
            '.card': { fill: '#FFFFFF', stroke: '#000000', 'stroke-width': 2, 'pointer-events': 'visiblePainted', rx: 10, ry: 10 },
            '.rank': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.5, 'ref-y': 0.2, 'font-family': 'Courier New', 'font-size': 14, 'font-weight': 900, 'text-anchor': 'middle', 'vertical-alligment': 'middle', 'text-direction': 'horizontal' },
            '.c1': { ref: '.card', 'ref-x': 0.33, 'ref-y': 0.76, },
            '.c2': { ref: '.card', 'ref-x': 0.48, 'ref-y': 0.76, },
            '.c3': { ref: '.card', 'ref-x': 0.63, 'ref-y': 0.76, },
            '.n1': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.35, 'ref-y': 0.7, 'font-family': 'Courier New', 'font-size': 14, 'text-anchor': 'end' },
            '.n2': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.5, 'ref-y': 0.7, 'font-family': 'Courier New', 'font-size': 14, 'text-anchor': 'end' },
            '.n3': { 'text-decoration': 'none', ref: '.card', 'ref-x': 0.65, 'ref-y': 0.7, 'font-family': 'Courier New', 'font-size': 14, 'text-anchor': 'end' },
        },
        "org_parent": '',
        "org_parent_id": '',
        "org_level": 0,
        "n1": 0,
        "n2": 0,
        "n3": 0,
        "is_advisor": false,
        "position_type": 'position',
        "tree_id": 0,
    }, {
        markup: '<g class="rotatable member3"><g class="scalable"><rect class="card"/><g class="card"><circle id="circle-move-down" name="circle-move-down" cx="85" cy="80" r="10"></circle><circle id="circle-move-left" name="circle-move-left" cx="-20" cy="30" r="10"></circle><circle id="circle-move-right" name="circle-move-right" cx="190" cy="30" r="10"></circle></g></g><text class="rank"/>' + this.c1 + '<text class="n1"/>' + this.c2 + '<text class="n2"/>' + this.c3 + '<text class="n3"/></g>',
    });
    showSelectorNode = true;

    constructor(
        private modalService: NgbModal,
        public overlay: Overlay,
        public viewContainerRef: ViewContainerRef,
        private http: HttpClient
    ) {}
    ngOnInit() {
        setTimeout(() => {
            this.graph = new joint.dia.Graph();
            this.paper = new joint.dia.Paper({
                    el: this.paperElement.nativeElement,
                    model: this.graph,
                    width: 1000,
                    height: 800,
                    gridSize: 10,
                    drawGrid: {
                        name: 'dot',
                        args: {
                            color: '#45d9d9'
                        }
                    },
                    perpendicularLinks: true,
                    restrictTranslate: true,
                    interactive: {
                        linkMove: true,
                        labelMove: true,
                        arrowheadMove: false,
                        vertexMove: true,
                        vertexAdd: true,
                        vertexRemove: true,
                        useLinkTools: true,
                    },

                }  as any);
        }, 500);
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.doLayout();
            this.paper.on('blank:pointerclick', (t, evt) => {
                console.log('Paper blank area clicked');
                this.clickPaperBlankAreaEvent.emit(t.model); //current position(node) from sheet to node tree details
            });
            this.paper.on('cell:pointerdblclick', (t, evt) => {  // set current node on graph node clicked
                this.click_actions(t, evt, false);
            });

            this.paper.on('cell:pointerclick', (t, evt) => {  // set current node on graph node clicked
                this.click_actions(t, evt, true);
            });

            this.paper.on('cell:contextmenu', (cellView, e, x, y) => {
                if (cellView.model.attributes.type == "org.Arrow") {
                    return
                }
                this.nodeGraphCurrent = cellView.model;
                let coordPaper = this.paper.clientOffset();
                this.open(cellView, e, e.clientX, e.clientY);
            });
            this.paper.on('blank:contextmenu', (e, x, y) => {
                let coordPaper = this.paper.clientOffset();
                this.openPaperContextMenu(e, e.clientX, e.clientY);
            });

            this.graph.on('add', (cell) => {
                this.updateDirectPositionsCounter();
                this.countAllSupervised();
                this.checkGraphNodeAdded(cell); // when add graph node assign tree id in order to relate each other
            })
            this.graph.on('remove', (cell) => {
                this.updateDirectPositionsCounter();
                this.countAllSupervised();
            })

        }, 1000);

    }

    click_actions(t, evt, click: boolean){
        if ((t.model.attributes.type == "org.Member") || (t.model.attributes.type == "org.Member2") || (t.model.attributes.type == "org.Member3")) {
            let nameRank = t.model.attributes.attrs['.rank'].text.replace(/\n/, '');
            this.nodeGraphCurrent = t.model;
        }

        this.nodeGraphAnyLastSelected = t;
        
        if(click){
            console.log('clicked')
            this.clickGraphNodeEvent.emit(t.model); //current position(node) from sheet to node tree details            
        } else {
            console.log('double clicked')
            this.dblclickGraphNodeEvent.emit(t.model); //current position(node) from sheet to node tree details
        }
        
        //Circle clicks
        if (evt) {
            const idx = evt.target.id;
            if (idx.indexOf('move-up') >= 0) this.mouseDownGraphNodeEvent.emit({ action: 'up', event: evt });
            else if (idx.indexOf('move-down') >= 0) this.mouseDownGraphNodeEvent.emit({ action: 'down', event: evt });
            else if (idx.indexOf('move-left') >= 0) this.mouseDownGraphNodeEvent.emit({ action: 'left', event: evt });
            else if (idx.indexOf('move-right') >= 0) this.mouseDownGraphNodeEvent.emit({ action: 'right', event: evt });
        }
        return;
    }

    updateSupervisedCounters() { //update all graph node counters for supervised positions
        this.updateDirectPositionsCounter();
        this.countAllSupervised();
    }

    checkGraphNodeAdded(cell: any) { // set tree id for new graph element created
        if (cell.attributes.type == "org.Arrow") { return }

        this.graphNodeAddedEvent.emit(cell);
    }

    drop(event: { source: CdkDrag < any > }) {   // when dropping from left bar position shapes  
        if (!event.source.data.sheetSelected.ID) {  // cancel if no active sheet
            event.source.reset()
            return;
        }

        let elements = this.graph.getElements();

        let dragRef: any = event.source._dragRef
        let pointerPosition = JSON.parse(JSON.stringify(dragRef._lastKnownPointerPosition));
        var localPoint1 = this.paper.clientToLocalPoint({
            x: pointerPosition.x,
            y: pointerPosition.y
        });
        let isAdvisor = false;
        if (event.source.data.positionType == "advisor") { isAdvisor = true }


        if (elements.length > 0) { // when sheet is blank, prevent link from self  
            let cellNewLocation: any = { attributes: { position: { x: localPoint1.x, y: localPoint1.y } } };
            let closest = this.getClosestGraphElement(cellNewLocation);
            let cellNew = this.member(
                closest,
                localPoint1.x,
                localPoint1.y,
                "New Node", "New Node", 'male.png', '#ffffff', '#797979', isAdvisor);
            this.configCell(cellNew, "New Node", event.source.data.positionType)

            //add link to closest father element     
            let linkClosest = this.getLinkDef(closest, cellNew)
            this.graph.addCell(linkClosest);
        } else {
            if (event.source.data.treeOrg && event.source.data.treeOrg.treeModel.nodes.length > 0) {
                event.source.reset()
                return;
            }
            let cellNew = this.member(
                null,
                localPoint1.x,
                localPoint1.y,
                "New Node", "New Node", 'male.png', '#ffffff', '#797979', isAdvisor);
            this.configCell(cellNew, "New Node", event.source.data.positionType)
        }



        event.source.reset()

    }


    adjustGraphContent() {   // adjust elements on paper if out of view
        let els = this.graph.getElements();
        let xs = [],
            ys = [];
        els.forEach((el, i) => {
            xs.push(el.attributes.position.x)
            ys.push(el.attributes.position.y)
            let minX = Math.min(...xs);
            let minY = Math.min(...ys);

            if (i >= els.length - 1) {
                if (minX < 0) {
                    this.graph.translate(minX * (-1), 0)
                }
                if (minY < 0) {

                    this.paper.translate(0, minY * (-1))
                }
            }
        })
    }

    openAddNodeModal(event, inputFormTemplate, cell) { // open modal for add child node 
        this.newNodeName = "";
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });
    }

    openAddNodeModalSibling(event, inputFormTemplate, cell) { // open modal for add sibling node 
        this.newNodeName = "";
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });
    }

    resetFillColor() {
        if (this.shapeProperties.fill.type = 'none') {
            this.shapeProperties.fill.color = 'rgba(255,255,255,1)'
        }
    }


    openConfigNodeModal(event, inputFormTemplate, cell) {  // open node config modal 
        //get custom shape value for init values 
        this.shapeProperties = {
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

        this.shapeProperties.fill.color = cell.model.attr('.card/fill');
        this.shapeProperties.fill.type = 'none';
        if (this.shapeProperties.fill.color != 'rgba(255,255,255,0.1)') {
            this.shapeProperties.fill.type = 'solid';
        }
        this.shapeProperties.line.color = cell.model.attr('.card/stroke');
        this.shapeProperties.line.type = 'none';
        if (this.shapeProperties.line.color != 'rgba(255,255,255,0.1)') {
            this.shapeProperties.line.type = 'solid';
        }
        this.shapeProperties.line.width = cell.model.attr('.card/stroke-width');
        this.shapeProperties.textBox.verticalAlligment = cell.model.attr('.rank/vertical-alligment');
        this.shapeProperties.textBox.textDirection = cell.model.attr('.rank/text-direction');
        this.contactsAditionalHash = {} //borrar
        this.contactsExceptionHash = {} //borrar
        this.newNodeName = "";
        this.newNodeName = cell.model.attributes.attrs[".rank"].text;
        let cellSize = cell.model.size()
        this.shapeProperties.width = cellSize.width;
        this.shapeProperties.height = cellSize.height;

        if (!cell.model.attributes.privacy) {
            cell.model.attributes.privacy = {
                enableAditional: false,
                enableException: false,
                contactsAditional: [],
                contactsException: []
            }
        } else {
            this.shapeProperties.privacy = cell.model.attributes.privacy;
        }

        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'lg',
            scrollable: false
        });
    }


    paperCurrentSizeX: any;
    paperCurrentSizeY: any;
    openConfigPaperModal(event, inputFormTemplate) {  //modal for sheet resize
        this.paperCurrentSizeX = this.paperElement.nativeElement.offsetWidth;
        this.paperCurrentSizeY = this.paperElement.nativeElement.offsetHeight;
        event.preventDefault();
        this.modalWindow = this.modalService.open(inputFormTemplate, {
            ariaLabelledBy: 'modal-basic-title',
            size: 'md',
            scrollable: false
        });
    }

    savePaperDimentions() {
        if ((this.paperCurrentSizeX < 1000) || (this.paperCurrentSizeY < 800)) {
            return
        }
        this.paper.setDimensions(this.paperCurrentSizeX, this.paperCurrentSizeY);  //change jointjs paper size
        this.sheetDimentionsChangeEvent.emit({ w: this.paperCurrentSizeX, h: this.paperCurrentSizeY }); // update sheet attrs 
    }


    //search contacts , aditional , exceptions
    searchContacts = (text$: Observable < string > ) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map(term => term.length < 1 ? [] :
                this.contacts.filter(v => v.Name.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
        )
    formatter = (x: {
        Name: string
    }) => x.Name;


    contactsAditional: any = []
    contactsException: any = []
    contactsAditionalHash: any = {} //borrar
    contactsExceptionHash: any = {} //borrar


    addAditionalShape(event: any) {
        let contactsSelected = event;
        contactsSelected.forEach((item, i) => {
            this.contactsAditionalHash[item.name] = true //borrar
            this.shapeProperties.privacy.contactsAditional.push({
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
            this.contactsExceptionHash[item.name] = true //borrar
            this.shapeProperties.privacy.contactsException.push({
                name: item.name,
                see: false,
                modify: false,
                delete: false
            });
        });
    }


    deleteAditionalShape(item: any, tree) { //borrar
        _.remove(this.shapeProperties.privacy.contactsAditional, (contact) => {
            return contact === item;
        });

    }
    deleteExceptionShape(item: any, tree) { //borrar
        _.remove(this.shapeProperties.privacy.contactsException, (contact) => {
            return contact === item;
        });

    }
    updateAditionalShape(item: any) { //borrar
        _.each(this.shapeProperties.privacy.contactsAditional, (contact) => {
            if (contact === item) {
                contact.see = item.see;
                contact.modify = item.modify;
                contact.delete = item.delete;
            }
        });
    }

    updateExceptionShape(item: any) { //borrar
        _.each(this.shapeProperties.privacy.contactsException, (contact) => {
            if (contact === item) {
                contact.see = item.see;
                contact.modify = item.modify;
                contact.delete = item.delete;
            }
        });
    }

    // end search contacts , aditional , exceptions

    openPaperContextMenu(e, x, y) { //open paper context menu 
        this.close();
        const positionStrategy = this.overlay.position()
            .flexibleConnectedTo({
                x,
                y
            })
            .withPositions([{
                originX: 'end',
                originY: 'bottom',
                overlayX: 'end',
                overlayY: 'top',
            }]);
        this.overlayRef2 = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.close()
        });
        this.overlayRef2.attach(new TemplatePortal(this.paperMenu, this.viewContainerRef, {
            //   $implicit: cell
        }));
        this.sub2 = fromEvent < MouseEvent > (document, 'click')
            .pipe(
                filter(event => {
                    const clickTarget = event.target as HTMLElement;
                    return !!this.overlayRef2 && !this.overlayRef2.overlayElement.contains(clickTarget);
                }),
                take(1)
            ).subscribe(() => this.close())
    }

    open(cell, e, x, y) {    /////// cell context menu
        this.close();
        const positionStrategy = this.overlay.position()
            .flexibleConnectedTo({
                x,
                y
            })
            .withPositions([{
                originX: 'end',
                originY: 'bottom',
                overlayX: 'end',
                overlayY: 'top',
            }]);
        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.close()
        });
        this.overlayRef.attach(new TemplatePortal(this.cellMenu, this.viewContainerRef, {
            $implicit: cell
        }));
        this.sub = fromEvent < MouseEvent > (document, 'click')
            .pipe(
                filter(event => {
                    const clickTarget = event.target as HTMLElement;
                    return !!this.overlayRef && !this.overlayRef.overlayElement.contains(clickTarget);
                }),
                take(1)
            ).subscribe(() => this.close())
    }


    saveSheet(sheet: Sheet, cells: any) {    //  delete all sheet nodes on tree node delete
        if (sheet.ID) {
            sheet.Data = JSON.stringify({
                "cells": cells
            });
            this.http.put < any > (this.urlApi + '/sheet/' + sheet.ID, sheet)
                .subscribe(
                    (any) => {
                        if (any) {
                            this.refreshSelectedSheetEvent.emit(sheet);  // refresh sheet on update
                        }
                    },
                    err => {
                        if (err.error && err.error.message) {
                            console.log(err.error.message);
                        }
                        return;
                    }
                );
        }
    }

    getGraphIdFromNodeName(name: any, cells: any, cb) {
        cells.forEach((cell) => {
            if (cell.type == "org.Member2" || cell.type == "org.Member3") {
                if (cell.attrs[".rank"].text == name) {
                    cb(cell)
                }
            }
        })
    }

    getGraphIdFromNodeId(treeNodeId: any, cells: any, cb) {
        let cell = _.find(cells, (cell) => { return cell.tree_id == treeNodeId })
        cb(cell);
    }


    deleteNodeSheetData(sheet, cells: any, cell: any) {
        _.remove(cells, function(el: any) {
            return el.id == cell.id;
        });
        _.remove(cells, function(el: any) {
            if (el.type == "org.Arrow") {
                return el.target.id == cell.id;
            }
        });
        _.remove(cells, function(el: any) {
            if (el.type == "org.Arrow") {
                return el.source.id == cell.id;
            }
        });
        this.saveSheet(sheet, cells);
        cells.forEach((elem) => {
            if (elem.org_parent_id == cell.id && (elem.type == "org.Member2" || elem.type == "org.Member3")) {
                _.remove(cells, function(el: any) {
                    return el.id == elem.id;
                });
                _.remove(cells, function(el: any) {
                    if (el.type == "org.Arrow") {
                        return el.target.id == elem.id;
                    }
                });
                _.remove(cells, function(el: any) {
                    if (el.type == "org.Arrow") {
                        return el.source.id == elem.id;
                    }
                });
                this.saveSheet(sheet, cells);
                this.deleteNodeSheetData(sheet, cells, elem);
            }
        })
    }



    deleteNodeAllSheets(node: any, sheets: any) {
        let nodeId: any = node.data.id //use  tree_id 
        sheets.forEach((sheet) => {
            if (sheet.Data != "" && sheet.Data != null && sheet.Data != undefined) {
                let data: any = JSON.parse(sheet.Data)
                this.getGraphIdFromNodeId(nodeId, data.cells, (cell) => {
                    if (cell) {
                        this.deleteNodeSheetData(sheet, data.cells, cell)
                    }
                })
            }

        })
    }
    // confirm delete tree node data
    beforeDeleteNodeSheetData(sheet, cells: any, cell: any) {
    }
    beforeDeleteNodeAllSheets(node: any, sheets: any) {
    }

    //END  delete all sheet nodes on tree node delete


    deleteCell(cell) {
        if (confirm('Delete this element and children elements?')) {
            this.getDirectChildrenCount(cell.model, (count) => {
                if (count > 0) {
                    this.deleteAllFromNode(cell.model);
                    var outbooundLinksCount = this.graph.getConnectedLinks(cell.model);
                    outbooundLinksCount.forEach((link) => {
                        link.remove();
                    })
                    cell.remove();
                    cell.model.remove();
                } else {
                    var outbooundLinksCount = this.graph.getConnectedLinks(cell.model);
                    outbooundLinksCount.forEach((link) => {
                        link.remove();
                    })
                    cell.remove();
                    cell.model.remove();
                }
            })
        }
        this.close();
    }
    editCell(cell) {
        this.close();
    }

    close() {
        this.sub && this.sub.unsubscribe();
        if (this.overlayRef) {
            this.overlayRef.dispose();
            this.overlayRef = null;
        }

        this.sub2 && this.sub2.unsubscribe();
        if (this.overlayRef2) {
            this.overlayRef2.dispose();
            this.overlayRef2 = null;
        }

    }


   getParent(element, cb) {
        let els = this.graph.getElements()
        let i = 0,
            c = 0;
        if (els.length <= 0) {
            return 0
        }
        els.forEach((el) => {
            if (el.id == element.id) {
                cb(el);
                return
            }
        })
    }

    getDirectChildrenCount(element, cb) {
        let els = this.graph.getElements()
        let i = 0,
            c = 0;
        if (els.length <= 0) {
            return 0
        }
        els.forEach((el) => {
            if (el.attributes.org_parent_id == element.id) {
                c = c + 1;
            }
            if (i >= els.length - 1) {
                cb(c);
            }
            i = i + 1;
        })
    }

    countAllSupervisedFromEl(elem: any, elemToAddCount: any) {  // update counter for all supervised below this node
        this.getElementChildren(elem, (children) => {
            children.forEach((child) => {
                elemToAddCount.attr(".n1/text", parseInt(elemToAddCount.attributes.attrs[".n1"].text) + 1);
                this.countAllSupervisedFromEl(child, elemToAddCount);
            })
        })
    }

    countAllSupervised() { // update counter for all supervised
        let els = this.graph.getElements()
        let i = 0
        els.forEach((elem) => {
            elem.attr(".n1/text", 0);
            this.countAllSupervisedFromEl(elem, elem);
            if (i >= els.length - 1) {
                return
            }
            i = i + 1;
        })
    }

    reorderPaperGraphRecur(parent: any, elem: any) { //reorder graph elements recursive
        this.nodeGraphCurrent = elem;
        //remove outbound links 
        var outbooundLinksCount = this.graph.getConnectedLinks(elem, {
            outbound: true
        });
        outbooundLinksCount.forEach((link) => {
            link.remove();
        })
        let unitX = -1;
        this.getElementChildren(elem, (children) => {
            children.forEach((child) => {
                let elXY = elem.position()
                child.position(elXY.x + (200 * unitX), elXY.y + (130));
                let newLink = this.getLinkDef(elem, child);
                this.graph.addCell(newLink);
                this.reorderPaperGraphRecur(elem, child);
                unitX = unitX + 1;
            })
        })
    }

    reorderPaperGraph() {  //reorder graph elements
        this.hashXY = {} // to check if node exists on same position
        let i = 0;
        let root = _.find(this.graph.getElements(), (item) => { return item.attributes.org_parent == 'root' })
        root.position(350, 50)
        setTimeout(()=>{this.adjustGraphContent()},800);    

        this.reorderPaperGraphRecur(null, root);
    }



    // check if exists same position  
    checkExistsPosition(pos, unitX, unitY) {
        if (this.hashXY[pos.x + '-' + pos.y]) {
            if (pos.x == this.hashXY[pos.x + '-' + pos.y].x) {

            }
        }
    }


    getElementChildren(element, cb) {
        let els = this.graph.getElements()
        let i = 0
        let children = []
        if (els.length <= 0) {
            return 0
        }
        els.forEach((el) => {
            if ((el.attributes.org_parent_id == element.id)) {
                children.push(el)
            }
            if (i >= els.length - 1) {
                cb(children);
            }
            i = i + 1;
        })
    }

    updateChildrenElementsOnChange(cb) {
        let els = this.graph.getElements()
        let i = 0
        els.forEach((elem) => {
            this.getElementChildren(elem, (children) => {
                elem.attr("children", children);
            })
            if (i >= els.length - 1) {
                cb(true);
            }
            i = i + 1;
        })
    }

    deleteAllFromNode(cell: any) {
        let els = this.graph.getElements()
        els.forEach((elem) => {
            var outbooundLinksCount = this.graph.getConnectedLinks(elem);
            if (elem.attributes.org_parent_id == cell.id) {
                this.getDirectChildrenCount(elem, (count) => {
                    if (count > 0) {
                        let clone = _.cloneDeep(elem);
                        elem.remove();
                        outbooundLinksCount.forEach((link) => {
                            link.remove();
                        })
                        this.deleteAllFromNode(clone);
                    } else {
                        elem.remove();
                    }
                })
            }
        })
    }


    configCell(cell, newNodeName, positionType) {  // config graph node 
        if (newNodeName == "") {
            alert("Name can't be blank");
            return;
        }
        if (newNodeName.includes('(t)')) positionType='temporal'
        let textMaxWidth = 130; // when element horizontal
        if (this.shapeProperties.textBox.textDirection == 'vertical') { textMaxWidth = 45; } //vertical 

        let opt = { width: textMaxWidth }
        let nameWrap = joint.util.breakText(newNodeName, opt)
        let attrsCell = { type: '', stops: [], attrs: {} };


        cell.attr('.rank/text', nameWrap);
        cell.attr('.card/fill', '#FFFFFF');
        cell.attr('.card/stroke', '#45d9d9');
        cell.attr('.card/strokeDasharray', null);

        ///custom shape styles 
        if (this.shapeProperties.fill.type != 'none') {
            cell.attr('.card/fill', this.shapeProperties.fill.color);
        }
        if (this.shapeProperties.fill.type == 'none') {
            cell.attr('.card/fill', 'rgba(255,255,255,1)');
        }
        if (this.shapeProperties.line.type != 'none') {
            cell.attr('.card/stroke', this.shapeProperties.line.color);
        }
        if (this.shapeProperties.line.type == 'none') {
            cell.attr('.card/stroke', 'rgba(255,255,255,1)');
        }
        cell.attr('.card/stroke-width', this.shapeProperties.line.width);
        cell.attr('.rank/vertical-alligment', this.shapeProperties.textBox.verticalAlligment);
        cell.attr('.rank/text-direction', this.shapeProperties.textBox.textDirection);
        let textDirection: any = '0,-1,1,0',
            verticalAlligment: any = '0,8'
        if (this.shapeProperties.textBox.verticalAlligment == 'middle') {
            verticalAlligment = '0,8'
        }
        if (this.shapeProperties.textBox.verticalAlligment == 'top') {
            verticalAlligment = '0,-10'
        }
        if (this.shapeProperties.textBox.verticalAlligment == 'bottom') {
            verticalAlligment = '0,15'
        }
        if (this.shapeProperties.textBox.textDirection == 'vertical') {
            textDirection = '0,-1,1,0'
            verticalAlligment = '-75,20'
        } else {
            textDirection = '1,0,0,1'
        }
        //cell.size(this.shapeProperties.width, this.shapeProperties.height);
        cell.attributes.size = {
                width: this.shapeProperties.width,
                height: this.shapeProperties.height,
        }
        cell.attr('.rank/transform', 'matrix(' + textDirection + ',' + verticalAlligment + ')');
        if (positionType == 'position') {
            cell.attr('.card/strokeDasharray', null);
        }
        if (positionType == 'external') {
            let color1 = cell.attr('.card/fill');
            cell.attr('.card/strokeDasharray', '5,10');

            if (color1.stops && color1.stops[0] && color1.stops[0].color) {
                color1 = color1.stops[0].color;
            }

            attrsCell = {
                type: 'linearGradient',
                stops: [{ offset: '0%', color: color1 }, { offset: '19%', color: color1 }, { offset: '20%', color: '#999999' }, { offset: '21%', color: color1 },
                    { offset: '39%', color: color1 }, { offset: '40%', color: '#999999' }, { offset: '41%', color: color1 }, { offset: '59%', color: color1 },
                    { offset: '60%', color: '#999999' }, { offset: '61%', color: color1 }, { offset: '79%', color: color1 }, { offset: '80%', color: '#999999' }, { offset: '81%', color: color1 },
                ],
                attrs: {}
            }
            attrsCell.attrs = {
                x1: '0%',
                y1: '15%',
                x2: '100%',
                y2: '100%'
            }
            cell.attr('.card/fill', attrsCell);

        }
        if (positionType == 'temporal') {
            cell.attr('.card/strokeDasharray', '5,10');

        }
        if (positionType == 'vacant') {
            cell.attr('.card/strokeDasharray', '5,10');
            let color1 = cell.attr('.card/fill');

            if (color1.stops && color1.stops[0] && color1.stops[0].color) {
                color1 = color1.stops[0].color;
            }

            attrsCell = {
                type: 'linearGradient',
                stops: [{ offset: '0%', color: color1 }, { offset: '19%', color: color1 }, { offset: '20%', color: '#999999' }, { offset: '21%', color: color1 },
                    { offset: '39%', color: color1 }, { offset: '40%', color: '#999999' }, { offset: '41%', color: color1 }, { offset: '59%', color: color1 },
                    { offset: '60%', color: '#999999' }, { offset: '61%', color: color1 }, { offset: '79%', color: color1 }, { offset: '80%', color: '#999999' },
                    { offset: '81%', color: color1 },
                ],
                attrs: {}
            }
            attrsCell.attrs = {}

            cell.attr('.card/fill', attrsCell);
        }
        cell.attributes.position_type=positionType;
        if (newNodeName != "New Node" && cell.attributes.tree_id != 0) {
            this.nodeGraphNameChangeEvent.emit({ name: newNodeName, tree_id: cell.attributes.tree_id }) // update tree node name on graph node change
                                                                                                        // nodeGraphNameChange() on home.component.ts
        }
    }


    clear() {   // clear  graph
        this.graph.clear();
    }



    unhighlightAll() {  // unhighlight all elements from graph
        var cells = this.graph.getElements();
        cells.forEach((cell) => {
            var cellView = this.paper.findViewByModel(cell);
            cellView.unhighlight()
        })
    }

    getNextCellByCurrentSearch() {  // get next node by current search
        if (this.searchGraphNodesResultIndex + 1 > this.searchGraphNodesResult.length - 1) {
            return
        }
        this.unhighlightAll();
        this.searchGraphNodesResultIndex = this.searchGraphNodesResultIndex + 1;
        var cellView = this.paper.findViewByModel(this.searchGraphNodesResult[this.searchGraphNodesResultIndex]);
        cellView.highlight();
    }
    getPreviousCellByCurrentSearch() { // get Previous node by current search
        if (this.searchGraphNodesResultIndex - 1 < 0 || this.searchGraphNodesResult.length < 1) {
            return
        }
        this.unhighlightAll();
        this.searchGraphNodesResultIndex = this.searchGraphNodesResultIndex - 1;
        var cellView = this.paper.findViewByModel(this.searchGraphNodesResult[this.searchGraphNodesResultIndex]);
        cellView.highlight();
    }

    getCellsByText(text) {  // find and highlight  graph nodes by text  
        this.unhighlightAll();
        if (text.length < 1) {
            return
        }

        this.searchGraphNodesResult = [];
        this.searchGraphNodesResultIndex = 0;
       // let pattern = new RegExp('^'+text, 'gi') //at begining
        let pattern = new RegExp(text, 'gi')
        var cells = this.graph.getElements();
        let result = []
        let i = 0
        cells.forEach((cell) => {
            if ((cell.attributes.attrs[".rank"].text).match(pattern)) {
                result.push(cell);
            }
            if (i >= cells.length - 1) {
                this.searchGraphNodesResult = result;
                if (result.length > 0) {
                    var cellView = this.paper.findViewByModel(result[0]);
                    cellView.highlight()
                }
            }
            i = i + 1
        })
    }


    setScale(scale: any) { // change jointjs paper scale
        this.paper.scale(scale);
        this.scale = scale;
        return;

    }

    translate(x: any, y: any) { // translate jointjs paper
        this.paper.translate(x, y);
        return;
    }

    getDirectSupervisedAndAvisors(element, cb) {  // get all direct supervised  and advisrors from node 
        let els = this.graph.getElements()
        let i = 0,
            direct = 0,
            advisors = 0;
        if (els.length <= 0) {
            return 0
        }
        els.forEach((el) => {
            if ((el.attributes.org_parent_id == element.id) && el.attributes.is_advisor == false) {
                direct = direct + 1;
            }
            if ((el.attributes.org_parent_id == element.id) && el.attributes.is_advisor == true) {
                advisors = advisors + 1;
            }
            if (i >= els.length - 1) {
                cb({
                    advisors: advisors,
                    direct: direct
                });
            }
            i = i + 1;
        })
    }

    updateDirectPositionsCounter() {   // update counter on graph nodes for direct supervised positions and advisors 
        let els = this.graph.getElements()
        els.forEach((elem) => {
            this.getDirectSupervisedAndAvisors(elem, (count) => {
                elem.attr(".n3/text", count.advisors);
                elem.attr(".n2/text", count.direct);
            })
        })
    }

    //define and return a graph element without adding to graph. Used on tree node and sheets sync 
    memberDef(parent: any, x: any, y: any, rank: any, name: any, id: any, image: any, background: any, textColor: any, isAdvisor: any, currentNode: any) {
        let org_parent: any = 'root';
        let org_parent_id: any = '';
        let org_level: any = 0;
        if (parent) {
            org_parent = parent.attrs[".rank"].text;
            org_parent_id = parent.id;
            org_level = parent.org_level + 1;
        }

        //Selected Node
        if (parent && currentNode.id == id && rank != "**Displacement**") {
            var cell = new this.Member3({
                position: { x: x, y: y },
                attrs: {
                    '.card': { fill: this.shapeProperties.fill.color, stroke: this.shapeProperties.line.color, 'stroke-width': this.shapeProperties.line.width },
                    '.rank': { text: rank, fill: textColor, 'word-spacing': '-5px', 'letter-spacing': 0, },
                    '.n1': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                    '.n2': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                    '.n3': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                },
                "org_parent": org_parent,
                "org_parent_id": org_parent_id,
                "org_level": org_level,
                "n1": 0,
                "n2": 0,
                "n3": 0,
                "is_advisor": isAdvisor,
                "tree_id": 0,
            });
            return this.memberAddDisplacement(cell, rank, parent)
        }
            
        //Common Node
        else {
            var cell = new this.Member2({
                position: { x: x, y: y },
                attrs: {
                    '.card': { fill: this.shapeProperties.fill.color, stroke: this.shapeProperties.line.color, 'stroke-width': this.shapeProperties.line.width },
                    '.rank': { text: rank, fill: textColor, 'word-spacing': '-5px', 'letter-spacing': 0, },
                    '.n1': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                    '.n2': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                    '.n3': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                },
                "org_parent": org_parent,
                "org_parent_id": org_parent_id,
                "org_level": org_level,
                "n1": 0,
                "n2": 0,
                "n3": 0,
                "is_advisor": isAdvisor,
                "tree_id": 0,
            });
            return this.memberAddDisplacement(cell, rank, parent)
        }
    };

    memberAddDisplacement(cell: any, rank: any, parent: any) {
        //Displacement Node
        if (rank == "**Displacement**") {
            cell.attributes.size.height = 0;
            cell.attributes.size.width = 0;
            cell.attributes.position.x = parent.position.x + 90;
            if (parent.attrs[".rank"].text == "**Displacement**") {
                cell.attributes.position.x = parent.position.x;
            }
            cell.attr('rect/display', 'none')
            cell.attr('.rank/display', 'none')
            cell.attr('.n1/display', 'none')
            cell.attr('.n2/display', 'none')
            cell.attr('.n3/display', 'none')
            cell.attr('.c1/display', 'none')
            cell.attr('.c2/display', 'none')
            cell.attr('.c3/display', 'none')
        }
        return cell;
    }

    getLinkDef(source: any, target: any, isDisplacement ? : any) {  // returns a link definition without adding to graph
        let endDirections = ['top'];
        if (target.attributes.is_advisor == true) { endDirections = ['right', 'left'] }


        if (isDisplacement && isDisplacement == true) {
            var cell = new joint.shapes.org.Arrow({
                source: {
                    id: source.id,
                    anchor: {
                        name: 'bottom',
                        args: {
                            dx: 0,
                            dy: 0
                        }
                    }
                },
                target: {
                    id: target.id,
                    anchor: {
                        name: 'top',
                        args: {
                            dx: 0,
                            dy: 0
                        }
                    },


                }
            });
        } else {
            var cell = new joint.shapes.org.Arrow({
                source: { id: source.id, },
                target: { id: target.id, }
            });
        }


        cell.router({
            name: 'manhattan',
            args: {
                padding: 10,
                startDirections: ['bottom'],
                endDirections: endDirections
            }
        });
        cell.attr(".connection/")
        cell.attr('.connection/stroke', '#45d9d9');
        return cell;
    }


    // add graph node element
    member(parent: any, x: any, y: any, rank: any, name: any, image: any, background: any, textColor: any, isAdvisor: any) {
        let org_parent: any = 'root';
        let org_parent_id: any = '';
        let org_level: any = 0;
        if (parent) {
            org_parent = parent.attributes.attrs[".rank"].text;
            org_parent_id = parent.id;
            org_level = parent.attributes.org_level + 1;
        }

        var cell = new this.Member2({
            position: {
                x: x,
                y: y
            },
            attrs: {
                '.card': { fill: this.shapeProperties.fill.color, stroke: this.shapeProperties.line.color, 'stroke-width': this.shapeProperties.line.width },
                '.rank': { text: rank, fill: textColor, 'word-spacing': '-5px', 'letter-spacing': 0, },
                '.n1': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                '.n2': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
                '.n3': { text: "0", fill: "#ffffff", 'font-size': 13, 'font-family': 'Arial', 'letter-spacing': 0 },
            },
            "org_parent": org_parent,
            "org_parent_id": org_parent_id,
            "org_level": org_level,
            "n1": 0,
            "n2": 0,
            "n3": 0,
            "is_advisor": isAdvisor,
            "tree_id": 0,
        });
        this.graph.addCell(cell);

        return cell;
    };

    // add graph link
    link(source: any, target: any, breakpoints: any) {
        var cell = new joint.shapes.org.Arrow({
            source: { id: source.id },
            target: { id: target.id },
            vertices: breakpoints,
            attrs: {
                ".connection": { 'fill': 'none', 'stroke-linejoin': 'round', 'stroke-width': '3', 'stroke': '#45d9d9' }
            }
        });
        this.graph.addCell(cell);
        this.updateDirectPositionsCounter();
        this.countAllSupervised();
        return cell;
    }


    @HostListener('window:resize', ['$event'])
    onResize(event) {
        if (!this.paper || !this.graph) {
            return;
        }
    }


    getNodeCurrentChildrenCount(cb) {
        let els = this.graph.getElements()
        let i = 0,
            c = 0;
        if (els.length <= 0) {
            return 0
        }
        els.forEach((el) => {
            if (el.attributes.org_parent_id == this.nodeGraphCurrent.id) {
                c = c + 1;
            }
            if (i >= els.length - 1) {
                cb(c);
            }
            i = i + 1;
        })
    }


    hashXY: any = {};
    addGraphNode(parent: any, unitX: any, unitY: any, name: any, code: any, positionType: any, modal ? : any) { // add full graph node with link

        if (name == 'undefined' || name == '') {
            alert("Node Name can't be empty")
            return
        }
        if (modal) {
            modal.dismiss('Cross click')
        }
        let newNode: any;

        if (parent) {

            this.getNodeCurrentChildrenCount((childrenCount) => {
                unitX = -1 + childrenCount;
                unitY = 1;

                // set location for element and link 
                if (this.isAdvisor == true) { //is advisor
                    newNode = this.member(
                        parent,
                        parent.attributes.position.x + 200,
                        parent.attributes.position.y + 70,
                        name, code, 'male.png', '#ffffff', '#797979', true);

                    let newLink = this.getLinkDef(parent, newNode)
                    this.graph.addCell(newLink)


                } else {
                    newNode = this.member(
                        parent,
                        parent.attributes.position.x + (200 * unitX),
                        parent.attributes.position.y + (130 * unitY),
                        name, code, 'male.png', '#ffffff', '#797979', false);
                    let newLink = this.getLinkDef(parent, newNode)
                    this.graph.addCell(newLink)

                }
                this.configCell(newNode, name, positionType);

            })
        } else { //root

            newNode = this.member(null,
                350,
                50,
                name, code, 'male.png', '#ffffff', '#555555', false);
            this.configCell(newNode, name, positionType);
        }
        return newNode;
    }


    getParentFor(element, cb) {
        let els = this.graph.getElements()
        let i = 0,
            c = 0;
        if (els.length <= 0) {
            return 0
        }
        els.forEach((el) => {
            if (el.id == element.attributes.org_parent_id) {
                cb(el);
                return
            }
        })
    }

    siblingSide: any = 'left';
    addGraphNodeSibling(siblingRoot: any, unitX: any, unitY: any, name: any, code: any, positionType: any, siblingSide: any, modal: any) {
        if (name == 'undefined' || name == '') {
            alert("Node Name can't be empty");
            return
        }

        if (modal) {
            modal.dismiss('Cross click')
        }
        let newNode: any;

        this.getParentFor(siblingRoot, (parent) => {
            if (parent) {
                unitX = 1;
                if (siblingSide == 'left') {
                    unitX = -1;
                }

                unitY = 1;

                // set location for element and link 
                if (this.isAdvisor == true) { //is advisor
                    newNode = this.member(
                        parent,
                        parent.attributes.position.x + 200,
                        parent.attributes.position.y + 70,
                        name, code, 'male.png', '#ffffff', '#797979', true);
                    let newLink = this.getLinkDef(parent, newNode)
                    this.graph.addCell(newLink)


                } else {
                    newNode = this.member(
                        parent,
                        parent.attributes.position.x + (200 * unitX),
                        parent.attributes.position.y + (130 * unitY),
                        name, code, 'male.png', '#ffffff', '#797979', false);
                    let newLink = this.getLinkDef(parent, newNode)
                    this.graph.addCell(newLink)

                }
                this.configCell(newNode, name, positionType);

            } else { //root

                newNode = this.member(null,
                    350,
                    50,
                    name, code, 'male.png', '#ffffff', '#555555', false);
                this.configCell(newNode, name, positionType);
            }
        })
        return newNode;
    }

    addFunctionalRelLink(source: any, target: any, isNotFunctional ? : any) { // add functional relantionship link
        var cell = new joint.shapes.org.Arrow({
            source: {
                id: source.id
            },
            target: {
                id: target.id
            }
        });

        cell.router({
            name: 'manhattan',

            args: {
                padding: 10,
                startDirections: ['bottom'],
                endDirections: ['top']
            }


        });
        cell.attr(".connection/")
        cell.attr('.connection/stroke', '#45d9d9');
        if (!isNotFunctional) {
            cell.attr('.connection/strokeDasharray', '5,10');
        }
        this.graph.addCell(cell);
    }


    addFunctionalRel(sourceName: any, targetName: any) { // add functional relantionship
        var cells = this.graph.getElements();
        let source = _.find(cells, function(el: any) {
            return sourceName == el.attributes.attrs['.rank'].text && el.attributes.type == "org.Member2";
        });
        let target = _.find(cells, function(el: any) {
            return targetName == el.attributes.attrs['.rank'].text && el.attributes.type == "org.Member2";
        });
        if (source && target) {
            this.addFunctionalRelLink(source, target)
        }
    }


    distanceFromAllEls(point2: any, elements: any) {
        let distances = [];
        for (var i = 0; i <= elements.length - 1; i++) {
            if (elements[i].id != point2.id) {
                let distance: any = Math.hypot(
                    parseInt(elements[i].attributes.position.x) - parseInt(point2.attributes.position.x),
                    parseInt(elements[i].attributes.position.y) - parseInt(point2.attributes.position.y)
                );
                if (parseInt(point2.attributes.position.y) <= parseInt(elements[i].attributes.position.y)) { // discard if position in Y is lower on graph
                    distances.push(10000000);
                } else {
                    distances.push(distance); //
                }
            } else {
                distances.push(10000000);
            }
        }
        return distances;
    }

    getClosestGraphElement(element: any) { // when element drop on  paper get closest 
        let elements = this.graph.getElements();
        let distances: any = [];
        distances = this.distanceFromAllEls(element, elements);
        let closestLinkIndex = distances.indexOf(Math.min(...distances));
        return elements[closestLinkIndex];
    }

    private doLayout() {
 
    }


}