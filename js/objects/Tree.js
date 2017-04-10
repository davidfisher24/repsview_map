var Config = require("../../config");
var user = require("../../models/user");
var treeTemplate = require("./treeTemplate");
var treeView = require("../../resources/treeview");
var Tree = Mn.Object.extend({


	initialize: function(options){
		// TREE DATA
		this.data = options.data; // JSON object Tree data
		this.reseau = options.reseau; // Reseau GP/SP
		this.hasToutes = options.hasToutes ? options.hasToutes : false; // Has an all node?
		// PRESELECTION DATA
		if (!options.commonSelections) options.commonSelections = "{}"; // JSON string
		this.commonSelections = JSON.parse(options.commonSelections);
		if (!options.userSelections) options.userSelections = "{}"; // JSON string
		this.userSelections = JSON.parse(options.userSelections);
		this.userSelectionsUpdate = options.userSelectionsUpdate; // Model route to update saved selection
		// TEXT AND HTML
		this.type = options.type;  // Route for saving in the model
		this.header = options.header; // HTML Modal Header
		this.text = options.treeText; // HTML Tree Header
		this.savedSelectionType = options.savedSelectionType; // Saved selection type
		this.div = options.div; // HTML Div reference
		this.selectedIds = options.selectedIds; // Currently selected tree nodes (number id) for on load
		this.currentPreselection = options.currentPreselection; // Current preselection id (integer)
		this.model = options.model; // Model reference
		this.callback = options.callback; // Callback for when close
		this.triggerButton = options.triggerButton; // Jquery button reference for style changes
		this.screenType = options.screenType; // Mobile or desktop
		this.hidePreselectionOptions = options.hidePreselectionOptions ? options.hidePreselectionOptions: false;
	},


	createHtml:function(){
		var _this = this;
		var context = {
			text: _this.capitalizeFirstLetter(_this.text),
			header: _this.header,
			commonSelections: this.commonSelections.html,
			userSelections: this.returnAlphabeticallyOrderedUserSelections(this.userSelections),
			desktop: false,
			mobile: false,
		};
		if (this.hidePreselectionOptions === true) {context.hidePreselections = true;}
		context[this.screenType] = true;
		$(this.div).html(treeTemplate(context));
		$('#loadpreselection').val(this.currentPreselection);
		if (!this.hidePreselectionOptions) this.showDeleteSelectionButton(this.currentPreselection);

		this.addEventListeners();
		this.loadTree();
		this.selectNodesOnLoad();

	},

	repositionElements:function(){
		var top = $(window).height() - $('#tree-modal').offset().top - $('#close-tree').height() - 15;
		$('#close-tree').css('top',top);
	},


	addEventListeners:function(){
		var _this = this;

		$('#close-modal').on('click',function(){
			_this.cancelSelection();
		});
		$('#closeModal').on('click',function(){
			_this.cancelSelection();
		});
		$('#close-tree, #close-tree-top').on('click',function(){
			_this.confirmSelection(true);

		});
		$('#refreshtreeview').on('click',function(){
			_this.refreshTree();
		});
		$('#savepreselection').on('click',function(){
			_this.savePreselection();
		});
		$('.save-preselection-confirm').on('click',function(){
			_this.savePreselectionConfirm();
		});
		$('.save-preselection-cancel').on('click',function(){
			_this.savePreselectionCancel();
		});
		$('.overwrite-preselection-confirm').on('click',function(){
			_this.overwritePreselectionConfirm();
		});
		$('.overwrite-preselection-cancel').on('click',function(){
			_this.overwritePreselectionCancel();
		});
		$('#loadpreselection').on('change',function(){
			_this.loadPreselection();
		});
		$('#clickbadge').on('click',function(){
			_this.showSelectedNodes();
		});
		$('.deletepreselection').on('click',function(){
			_this.deletePreselection();
		});
		$('.delete-preselection-confirm').on('click',function(){
			_this.deletePreselectionConfirm();
		});
		$('.delete-preselection-cancel').on('click',function(){
			_this.deletePreselectionCancel();
		});

		$('#tree-modal').on('mousemove click',function(){
			_this.repositionElements();
		});
	},

	loadTree:function(){
		var _this = this;
		var data = this.data;
		var tree = $('#treeDiv').treeView({
			data: data,
			counter: '#currentproductsselected',
			allNode: _this.hasToutes,
			levels: 0,
			showTags:true,
			showCheckbox: true,
			disabled:false,
			multiSelect: true,
			icon: "glyphicon glyphicon-unchecked",
			state: {
				checked: true,
				disabled: true,
				expanded: true,
			}
		});
	},


	refreshTree:function(){
		$('#treeDiv').treeView('disableAll', { silent: true });
		$('#treeDiv').treeView('enableAll', { silent: true });
		$('#loadpreselection').val('0');
		this.currentPreselection = 0;
		this.showDeleteSelectionButton(0);
	},


	selectNodesOnLoad:function(){
		var nodes = this.selectedIds;
		$("#treeDiv").treeView('checkNode', [ nodes, { silent: true } ]);
	},


	confirmSelection:function(runCallback){
		var _this = this;

		var ids = [];
		var nodes = [];
		var text = [];
		var selectedNodes = $('#treeDiv').treeView('getChecked');
		for (var i=0; i< selectedNodes.length; i++){
			ids.push(selectedNodes[i].id);
			nodes.push(selectedNodes[i].nodeId);
			text.push(selectedNodes[i].text.split("<")[0]);
		}

		this.model.set(this.type + "Selected",ids);
		this.model.set(this.type + "SelectedNodes",nodes);
		this.model.set(this.type + "SelectedSelection",this.currentPreselection);
		this.model.set(this.type + "SelectedText",text);

		if (this.hasToutes === true) {
			if (selectedNodes.length === 0 || (selectedNodes.length === 1 && selectedNodes[0].nodeId === 0)) {
				$('#'+_this.triggerButton).next().removeClass('btn-warning').addClass('btn-primary');
			} else {
				$('#'+_this.triggerButton).next().removeClass('btn-primary').addClass('btn-warning');
			}
		}

		if (this.callback !== null && runCallback === true) {
			this.callback();
		}
		$("#maux").modal('hide');

	},

	cancelSelection:function(){
		$("#maux").modal('hide');
	},


	showSelectedNodes:function(){
		if ($('#treeDiv').children().children().length > this.data.length) {
			$('#treeDiv').treeView('collapseAll', { silent: true });
		} else {
			$('#treeDiv').treeView('revealNode', [ $('#treeDiv').treeView('getChecked'), { silent: true } ]);
		}
	},


	//////////////////////////////
	// CONTROLS WITHIN THE TREE //
	//////////////////////////////


	///////////////////////////////////////////
	// PANEL DISPLAY FOR CONFIRMING/DELETING //
	///////////////////////////////////////////

	savePreselection:function(){
		$(".treeviewfooter1").hide();
		$(".treeviewfooter2").show();
		$('#close-tree').hide();

		var fillText = $("#loadpreselection option:selected").text();
		if (fillText !== 'Aucune préselection' && $('#loadpreselection option:selected').css('color') !== 'rgb(230, 149, 0)') {
			$('#save-selection-name').val(fillText);
		}

		this.showHideTreeLoading("show",false,false);
	},


	savePreselectionCancel:function(){
		$(".treeviewfooter1").show();
		$('#close-tree').show();
		$(".treeviewfooter2").hide();
		$('#save-selection-name').val('');
		$('#loadpreselection').attr('disabled',false);
		this.showHideTreeLoading("hide",false);
	},

	overwritePreselectionCancel:function(){
		$(".treeviewfooter2").show();
		$(".treeviewfooter3").hide();
	},

	deletePreselection:function(){
		this.showHideTreeLoading("show",false);
		$('#close-tree').hide();
		var selectionText = $('#loadpreselection').find(":selected").text();
		$('#tree-deletion-panel').show('slow');
		$('#tree-deletion-text').html('Confirmation - supprimer la préselection ' + selectionText);
	},


	deletePreselectionCancel:function(){
		this.showHideTreeLoading("hide",false);
		$('#tree-deletion-panel').hide('slow');
		$('#close-tree').show();
	},

	////////////////////////////////////
	// CRUD CALLS FOR PRESELECTIONS ////
	// 1. Save a preselection //////////
	// 2. Overwrite an preselection ////
	// 3. Delete a preselection ////////
	// 4. Update preselection options //
	////////////////////////////////////

	savePreselectionConfirm:function(){
		var _this = this;
		var name = $('#save-selection-name').val();

		if (name === "" || name === null) {
			$('#empty-name-warning').show();
			$('#empty-name-warning').fadeOut(3000,function(){$('#empty-name-warning').hide();});
			return;
		}

		var check =  $.map(this.userSelections, function(value, index) {
			if (value.name == name) return [value];
		});

		if (check.length > 0) {
			$(".treeviewfooter2").hide('slow');
			$(".treeviewfooter3").show('slow');
			$('#tree-loading-bar').hide();
		} else {

			_this.showHideTreeLoading("show",true);
			$.when(_this.registerPreselection(name,"save")).then(function(response){
				$(".treeviewfooter1").show();
				$('#close-tree').show();
				$(".treeviewfooter2").hide('slow');
				$(".treeviewfooter3").hide('slow');
				_this.showHideTreeLoading("hide",true);

				var elements = [];
				$('#treeDiv').treeView('getChecked').filter(function(obj){
					elements.push(obj.id);
				});
				var n = parseInt(response);
				_this.currentPreselection = n;
				_this.userSelections[n] = {
					id: n,
					name: name,
					html: "<option value ='"+n+"' title='"+name+"' $color>"+name+"</option>",
					elements: elements,
					deletable: true,
				};
				_this.updatePreselectionOptions(n);
				_this.showDeleteSelectionButton(n);
			});
		}
	},

	overwritePreselectionConfirm:function(){
		var _this = this;
		$('#loadpreselection').attr('disabled',true);
		var name = $('#save-selection-name').val();
		if (name === "" || name === null) {
			$('#empty-name-warning').show();
			$('#empty-name-warning').fadeOut(3000,function(){$('#empty-name-warning').hide();});
			return;
		}

		var selection =  $.map(this.userSelections, function(value, index) {
			if (value.name == name) return [value];
		});

		var elements = [];
		$('#treeDiv').treeView('getChecked').filter(function(obj){
			elements.push(obj.id);
		});
		this.userSelections[parseInt(selection[0].id)].elements = elements;

		_this.showHideTreeLoading("show",true);
		$.when(this.registerPreselection(name,"update")).then(function(response){
			$('#close-tree').show();
			$(".treeviewfooter2").hide('slow');
			$(".treeviewfooter3").hide('slow');
			$(".treeviewfooter1").show();
			$('#close-tree').show();
			$('#loadpreselection').attr('disabled',false);
			_this.showHideTreeLoading("hide",true);
			_this.updatePreselectionOptions(selection[0].id);
		});
	},

	deletePreselectionConfirm:function(){
		var _this = this;
		_this.showHideTreeLoading("show",true);
		var id = $('#loadpreselection').val();
		$.when(this.deleteSavedSelection(id)).then(function(response){
			$('#tree-deletion-panel').hide('slow');
			$(".treeviewfooter1").removeClass('no');
			$('#close-tree').show();
			$(".treeviewfooter2").addClass('no');
			_this.showHideTreeLoading("hide",true);
			delete _this.userSelections[id];
			_this.updatePreselectionOptions();
			_this.refreshTree();
		});
	},

	updatePreselectionOptions:function(value){
		// We can update the model here as all the update functions redirect here on success. Needs to be stringified */

		var _this = this;
		var newHtml = this.returnAlphabeticallyOrderedUserSelections(this.userSelections);

		this.userSelections.html = newHtml;
		this.model.set(this.userSelectionsUpdate,JSON.stringify(this.userSelections));
		$('#loadpreselection').html('');
		$('#loadpreselection').html("<option value='0'>Aucune préselection</option>" + this.commonSelections.html + this.userSelections.html);
		if (value) $('.load-saved-selection').val(value);
		else $('.load-saved-selection').val(0);
	},

	showDeleteSelectionButton:function(id){
		if (id === 0) {
			$('.deletepreselection').addClass('no');
			return;
		}

		var selection = this.userSelections[id] ? this.userSelections[id] : this.commonSelections[id];
		if (selection.deletable === true) $('.deletepreselection').removeClass('no');
		else $('.deletepreselection').addClass('no');
	},

	//////////////////////////////////////////////
	// AJAX CALLS FOR CRUD FUNCTIONS /////////////
	// 1. get saved selection (in disuse) ////////
	// 2. can be deleted (in disuse) /////////////
	// 3. Delete saved selection (used) //////////
	// 4. Register preselection (used) ///////////
	// 5. Load preselection options (in disuse) //
	//////////////////////////////////////////////

	deleteSavedSelection:function(id){
		var _this = this;
		var url = Config.rootUrl + "/index.php?option=com_router&target=getparameters";
		var data = {
			username: user.get("username"),
			action:"delete",
			id: id,
		};
		return $.ajax(url,{
			method: "POST",
			data: data,
			success: function(){
			},
			error:function(e){
			}
		});
	},

	registerPreselection:function(name,action){
		var _this = this;
		var elements = [];
		$('#treeDiv').treeView('getChecked').filter(function(obj){
			elements.push(obj.id);
		});
		var selection = JSON.stringify(elements);
		var url = Config.rootUrl + "/index.php?option=com_router&target=getparameters";
		var data = {
			username: user.get("username"),
			type: _this.savedSelectionType,
			action:action,
			description: name,
			selection: selection,
		};
		return $.ajax(url,{
			method: "POST",
			data: data,
			success: function(response){
			},
			error:function(e){
			}
		});
	},

	/////////////////////////////////////////////////////////////////////////////////////////

	showHideTreeLoading:function(action,load,input){
		if (action == "show") {
			if(load === true) {
				$('#tree-loading-bar').show();}

			if (input === true) {$('#save-selection-name').addClass('disable');}
			$('#loadpreselection').addClass('disable');
			$('#treeDiv').addClass('disable');
			$('#savepreselection').addClass('disable');
			$('#clickbadge').addClass('disable');
			$('#deletepreselection').addClass('disable');
			$('#refreshtreeview').addClass('disable');
			$('#show-selected-nodes').addClass('disable');
			$('.modal-ok').addClass('disable');
		} else if (action == "hide") {
			if(load === true) {
				$('#tree-loading-bar').hide();}

			$('#loadpreselection').removeClass('disable');
			$('#treeDiv').removeClass('disable');
			$('#savepreselection').removeClass('disable');
			$('#clickbadge').removeClass('disable');
			$('#deletepreselection').removeClass('disable');
			$('#refreshtreeview').removeClass('disable');
			$('#show-selected-nodes').removeClass('disable');
			$('.modal-ok').removeClass('disable');
			$('#save-selection-name').removeClass('disable');
		}
	},



	loadPreselection:function(){
		var _this = this;
		var id = $('#loadpreselection').val();
		_this.currentPreselection = id;
		if (parseInt(id) !== 0) {

			var selection;
			var deleteable;
			if (_this.commonSelections[id]) {
				selection = _this.commonSelections[id].elements;
				deleteable = _this.commonSelections[id].deletable;
			} else if (_this.userSelections[id]) {
				selection = _this.userSelections[id].elements;
				deleteable = _this.userSelections[id].deletable;
			}

			$('#treeDiv').treeView('uncheckAll');
			$('#treeDiv').treeView('collapseAll');
			var ids = [];


			for (var a=0; a<selection.length; a++) {
				if (selection[a].charAt(0) == ".") {
					$('#treeDiv').treeView('checkByClass',selection[a]);
				} else {
					ids.push(selection[a]);
				}
			}

			if (ids.length !== 0) {
				$('#treeDiv').treeView('checkByIdNames', [ids]);
			}

			_this.showDeleteSelectionButton(id);
		} else {
			_this.refreshTree();
		}
	},


	returnAlphabeticallyOrderedUserSelections:function(object){
		var _this = this;
		var html = "";
		var array = [];
		for (var key in object) {
			if (key !== 'html') array.push([object[key].name,object[key].html]);
		}
		array.sort(function(a,b) {
			if(_this.removeAccents(a[0].toLowerCase()) < _this.removeAccents(b[0].toLowerCase())) return -1;
			if(_this.removeAccents(a[0].toLowerCase()) > _this.removeAccents(b[0].toLowerCase())) return 1;
			return 0;
		});
		for (var i=0; i<array.length; i++) html += array[i][1];
		return html;
	},


	removeAccents:function(string){
		var strAccents = string.split('');
		var strAccentsOut = [];
		var strAccentsLen = strAccents.length;
		var accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
		var accentsOut = ['A','A','A','A','A','A','a','a','a','a','a','a','O','O','O','O','O','O','O','o','o','o','o','o','o','E','E','E','E','e','e','e','e','e','C','c','D','I','I','I','I','i','i','i','i','U','U','U','U','u','u','u','u','N','n','S','s','Y','y','y','Z','z'];
		for (var y = 0; y < strAccentsLen; y++) {
			if (accents.indexOf(strAccents[y]) != -1) {
				strAccentsOut[y] = accentsOut[accents.indexOf(strAccents[y])];
			}
			else
			strAccentsOut[y] = strAccents[y];
		}
		strAccentsOut = strAccentsOut.join('');
		return strAccentsOut;
	},

	capitalizeFirstLetter:function(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	},

});

module.exports = Tree;
