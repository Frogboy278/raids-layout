
var boxSize = 70;
var boxMargin = 17;
var floorMargin = 16;
var borderWidth = 7;

var selectedBox;
var links = [];
var values = new Array(16);

var solutions;

var pattern1_names = ["Tekton","Vasa","Guards","Mages","Shamans","Muta","Vangs","Vesp"];
var pattern1 = [];
var pattern2_names = ["Tekton","Muta","Guards","Vesp","Shamans","Vasa","Vangs","Mages"];
var pattern2 = [];

function initPatterns()
{
    // Build doubly linked lists to represent each circular pattern.
    var lastRoom = null;
    var currentRoom = null;
    for (var i = 0; i < pattern1_names.length; i++) {
        currentRoom = {
            name: pattern1_names[i]
        };
        if (lastRoom) {
            lastRoom.next = currentRoom;
            currentRoom.prev = lastRoom;
        }
        pattern1.push(currentRoom);
        lastRoom = currentRoom;
    }
    pattern1[0].prev = pattern1[pattern1.length-1]
    pattern1[pattern1.length-1].next = pattern1[0]

    var lastRoom = null;
    var currentRoom = null;
    for (var i = 0; i < pattern2_names.length; i++) {
        currentRoom = {
            name: pattern2_names[i]
        };
        if (lastRoom) {
            lastRoom.next = currentRoom;
            currentRoom.prev = lastRoom;
        }
        pattern2.push(currentRoom);
        lastRoom = currentRoom;
    }
    pattern2[0].prev = pattern2[pattern2.length-1]
    pattern2[pattern2.length-1].next = pattern2[0]
}

function getCombatPatternPossibilitiesByLength(length)
{
    var possiblePatterns = [];

    for (var i = 0; i < pattern1_names.length; i++)
    {
        var cwPattern1 = [];
        var ccwPattern1 = [];
        var room1 = pattern1.filter(function(room){return room.name === pattern1_names[i];})[0];
        cwPattern1.push(room1);
        ccwPattern1.push(room1);

        var cwPattern2 = [];
        var ccwPattern2 = [];
        var room2 = pattern2.filter(function(room){return room.name === pattern2_names[i];})[0];
        cwPattern2.push(room2);
        ccwPattern2.push(room2);

        for (var j = 0; j < length-1; j++)
        {
            // Pattern 1, clockwise and counter-clockwise
            cwPattern1.push(cwPattern1[cwPattern1.length-1].next);
            ccwPattern1.push(ccwPattern1[ccwPattern1.length-1].prev);

            // Pattern 2, clockwise and counter-clockwise
            cwPattern2.push(cwPattern2[cwPattern2.length-1].next);
            ccwPattern2.push(ccwPattern2[ccwPattern2.length-1].prev);
        }

        possiblePatterns.push(cwPattern1);
        possiblePatterns.push(ccwPattern1);
        possiblePatterns.push(cwPattern2);
        possiblePatterns.push(ccwPattern2);
    }

    return possiblePatterns
}

function patternIsMatch(roomsFromMap, possiblePattern)
{
    var matches = true;
    for (var i = 0; i < roomsFromMap.length; i++)
    {
        if (roomsFromMap[i] != possiblePattern[i].name && roomsFromMap[i] != "Combat") {
            matches = false;
        }
    }
    
    return matches;
}

function getStringForSymbol(symbol)
{
    switch (symbol)
    {
        case "C":
            return "Combat"
        case "P":
            return "Puzzle"
        case "S":
            return "Scavs"
        case "F":
            return "Farming"
        case "#":
            return "Start"
        case "¤":
            return "End"
        default:
            return "N/A"
    }
}

function solveCombatOrder(solution)
{
    // Find the index of the first room
	var layout = solution.layout;
    var startPos = -1;
	for (var i = 0; i < 16; i++) 
    {
        if (layout[i])
        {
            if (layout[i].symbol === "#") 
            {
                startPos = i;
                break;
            }
        }
    }

    if (startPos != -1) 
    {
        // Build array of rooms in sequential order from the solved raid
        var hasNext = true;
        var roomOrder = [];
        var lastRoom = layout[startPos];
        roomOrder.push(lastRoom);
        while (hasNext) 
        {
            var nextRoom = lastRoom.next;
            lastRoom = nextRoom;
            roomOrder.push(lastRoom);

            if (lastRoom.id > 7 && lastRoom.symbol === "¤")
                hasNext = false;
        }

        // Attach specific room names the user entered to the solved raid array
        var combatRoomIndexes = [];
        for (var i = 0; i < roomOrder.length; i++)
        {
            if (values[roomOrder[i].id]) {
                var name = values[roomOrder[i].id].name;
                roomOrder[i].name = name ? name : getStringForSymbol(roomOrder[i].symbol)
            }
            else {
                roomOrder[i].name = getStringForSymbol(roomOrder[i].symbol)
            }

            if (roomOrder[i].symbol === "C") {
                combatRoomIndexes.push(i);
            }
        }

        // Solve combat order: get every possible raid for the given combat rooms
        var possibleRaids = getPossibleRaids(roomOrder, combatRoomIndexes);

        // If there's only 1 possible solution, update the main raid array with the solved combat rooms
        if (possibleRaids.length == 1) 
        {
            var solvedRaid = possibleRaids[0]
            for (var i = 0; i < roomOrder.length; i++)
            {
                for (var j = 0; j < solvedRaid.length; j++)
                {
                    if (roomOrder[i].id == solvedRaid[j].id && solvedRaid[j].generated) {
                        roomOrder[i].name = solvedRaid[j].name;
                    }
                }
            }
        }

        // Build a string for each possible raid detailing the order of combat and puzzle rooms
        var possibleRaidStrings = [];
        for (var i = 0; i < possibleRaids.length; i++)
        {
            var rooms = possibleRaids[i];
            var roomStrings = [];
            for (var j = 0; j < rooms.length; j++)
            {            
                if (rooms[j].symbol === "C" || rooms[j].symbol === "P") 
                {
                    var colour = rooms[j].symbol === "C" ? "#A3D4FF" : "";
                    var str = "<span style='background-color: "+colour+"'>"+ rooms[j].name + "</span>";
                    roomStrings.push(str);
                }
            }
            
            possibleRaidStrings.push(roomStrings.join(", ").toLowerCase());
        }
        $("#rotations").empty();
        $("#rotations").append(possibleRaidStrings.join("</br> ").toLowerCase());
    }
}

function getPossibleRaids(layout, combatRoomIndexes)
{
    // Build an array of only the combat room names in sequential order
    // Ex: combatRoomNames = ["Tekton", "Combat", "Combat", "Mages"]
    var combatRoomNames = layout
        .filter(function(room){return room.symbol === "C";})
        .map(function(room) {return room.name;});

    // Get all the possible combiniations of n-length combat room orders
    var possiblePatterns = getCombatPatternPossibilitiesByLength(combatRoomNames.length);

    // Check each possible sequence against the combat rooms entered by the users and save the matches
    var matches = [];
    for (var i = 0; i < possiblePatterns.length; i++)
    {
        if (patternIsMatch(combatRoomNames, possiblePatterns[i])) {
            matches.push(possiblePatterns[i]);
        }
    }

    // For each possible match, build a complete copy of the raid with the solved combat room names attached
    var possibleRaids = [];
    for (var i = 0; i < matches.length; i++)
    {
        var possibleRaid = getCopyOfSolvedRaid(layout);
        for (var j = 0; j < matches[i].length; j++)
        {
            if (possibleRaid[combatRoomIndexes[j]].name == "Combat")
            {
                possibleRaid[combatRoomIndexes[j]].generated = true;
            }
            var roomName = matches[i][j].name;
            possibleRaid[combatRoomIndexes[j]].name = roomName;
        }
        possibleRaids.push(possibleRaid);
    }

    return possibleRaids;
}

function getCopyOfSolvedRaid(solvedRaid)
{
    var newRaid = [];
    for (var i = 0; i < solvedRaid.length; i++)
    {
        newRaid.push({
            symbol: solvedRaid[i].symbol,
            name: solvedRaid[i].name,
            id: solvedRaid[i].id,
        });
    }
    
    return newRaid;
}

function setupBoxes() {
	var boxes = $(".box");
	for (var i = 0; i < boxes.length; i++) {
		var box = $(boxes[i]);
		var id = parseInt(box.data("box-id"));
		var x = id % 4 * (boxSize + boxMargin);
		var y = id % 8 < 4 ? 0 : boxSize + boxMargin;
		if (id >= 8) x += 4 * (boxSize + boxMargin) + floorMargin;
		box.css("left", x);
		box.css("top", y);
	}
	
	solutions = solve();
	solveRaid();
}

function getBoxId(box) {
	return parseInt($(box).data("box-id"));
}

function solveRaid() {
	removeAutoFill();

	var totValid = 0;
	var lastSol;
	var valid;
	for (var solId = 0; solId < solutions.length; solId++) {
		valid = true;
		var sl = solutions[solId].layout;
		for (var i = 0; i < 16; i++) {
			if (values[i] && sl[i] && values[i].symbol !== sl[i].symbol) {
				valid = false;
				break;
			}
		}
		for (var i = 0; i < links.length; i++) {
			if (!sl[links[i].from] ||
				(
				(!sl[links[i].from].next || sl[links[i].from].next !== sl[links[i].to]) &&
				(!sl[links[i].from].prev || sl[links[i].from].prev !== sl[links[i].to])
				))
			{
				valid = false;
				break;
			}
		}
		if (valid) {
			totValid++;
			lastSol = solutions[solId];
		}
	}
	
	$(".solutions-value").text(totValid);
	
	if (totValid === 1) {
		autoFill(lastSol);
	}
}

function autoFill(solution) {
    solveCombatOrder(solution);
	removeAutoFill();

	var sl = solution.layout;
	for (var i = 0; i < 16; i++) {
		var box = $(".box[data-box-id=" + i + "]");
		if (box.text().length === 0) {
			box.addClass("autofill");
			if (sl[i]) {
				box.text(sl[i].name);
				if (sl[i].next) {
					linkBoxes(
						$(".box[data-box-id=" + sl[i].id + "]"),
						$(".box[data-box-id=" + sl[i].next.id + "]"),
						true);
				}
				if (sl[i].prev) {
					linkBoxes(
						$(".box[data-box-id=" + sl[i].id + "]"),
						$(".box[data-box-id=" + sl[i].prev.id + "]"),
						true);
				}
			}
		}
	}
}

function removeAutoFill() {
	$(".box.autofill").removeClass("autofill").text("");
	$(".link.autofill").removeClass("autofill").remove();
}

function selectBox(box) {
	box = $(box);
	if (selectedBox) {
		selectedBox.removeClass("selected");
	}
	
	selectedBox = box;
	
	box.addClass("selected");
}

function setBoxValue(value, roomName) {
	if (!selectedBox) return;
	var id = getBoxId(selectedBox);
	values[id] = {symbol: value, name: roomName};
	if (selectedBox.hasClass("autofill")) {
		selectedBox.removeClass("autofill");
	}
	selectedBox.text(roomName || value);
	solveRaid();
}

function unlinkBox(box) {
	box = $(box);
	var id = parseInt(box.data("box-id"));

	for (var i = 0; i < links.length; i++) {
		if (links[i].from === id || links[i].to === id) {
			$(links[i].div).remove();
			links.splice(i, 1);
			i--;
		}
	}
	
	solveRaid();
}

function linkBoxes(box1, box2, autofill) {
	box1 = $(box1);
	box2 = $(box2);
	
	var id1 = parseInt(box1.data("box-id"));
	var id2 = parseInt(box2.data("box-id"));
	
	if (id1 > id2) {
		var tmp = id1;
		id1 = id2;
		id2 = tmp;
	}
	
	if (id1 === id2) {
		unlinkBox(box1);
		return true;
	}
	if (id1 < 0 || id1 >= 16 || id2 < 0 || id2 >= 16) {
		return false;
	}
	if (Math.floor(id1 / 8) !== Math.floor(id2 / 8)) {
		return false;
	}
	if (id1 % 8 === 3 && id2 % 8 === 4)
	{
		return false;
	}
	if (id2 - id1 !== 1 && id2 - id1 !== 4) {
		return false;
	}
	for (var i = 0; i < links.length; i++) {
		if (links[i].from === id1 && links[i].to === id2) {
			return false;
		}
	}
	
	var x = id2 % 4 * (boxSize + boxMargin);
	var y = id2 % 8 < 4 ? 0 : boxSize;
	
	var div = $("<div class=\"link\">");
	if (id2 - id1 === 1) {
		div.width(boxMargin);
		div.height(borderWidth);
		y += boxSize / 2 + boxMargin * (id1 % 8 < 4 ? 0 : 1);
		x -= boxMargin;
		y -= borderWidth / 2;
	}
	else {
		div.width(borderWidth);
		div.height(boxMargin);
		x += boxSize / 2;
		x -= borderWidth / 2;
	}
	
	if (id2 >= 8) x += 4 * (boxSize + boxMargin) + floorMargin;
	div.css({
		left: x,
		top: y
	});
	
	var autofills = $(".links.autofill");
	for (var i = 0; i < autofills.length; i++) {
		var af = autofills[i];
		if (af.css("left") === div.css("left") && af.css("top") === div.css("top")) {
			af.remove();
		}
	}
	$(".links").append(div);
	
	if (autofill) {
		div.addClass("autofill");
	}
	else {
		links.push({
			from: id1,
			to: id2,
			div: div
		});
		
		solveRaid();
	}
}

$(document).ready(function() {
	
	setupBoxes();
    initPatterns();
	
	$(".box").mousedown(function(e) {
		if (e.button === 0) {
			selectBox(this);
		}
		else if (e.button === 2 && selectedBox) {
			linkBoxes(selectedBox, this);
		}
		
		
	});
	
	$(document).click(function(e) {
		if (!$(e.target).hasClass("box") 
         && !$(e.target).hasClass("room-btn") 
         && !$(e.target).hasClass("combat-room-btn")
         && !$(e.target).hasClass("puzzle-room-btn")
         ) {
			selectBox();
		}
	});
	
	$(document).contextmenu(function(e) {
		e.preventDefault();
		return false;
	});
	
	$(".room-btn").click(function(e) {
		var val = $(this).val();
		setBoxValue(val, null);
	});
    
    $(".combat-room-btn").click(function(e) {
		var val = $(this).val();
		setBoxValue("C", val);
	});
    
    $(".puzzle-room-btn").click(function(e) {
		var val = $(this).val();
		setBoxValue("P", val);
	});
	
	$(".reset-btn").click(function(e) {
		$(".autofill").removeClass("autofill");
		$(".link").remove();
		$(".box").text("");
		values = new Array(16);
		links = [];
		solveRaid();
	});
	
});
