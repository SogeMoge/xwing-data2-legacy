import csv
import json

def get_ships_for_faction(faction, manifest_json_file_path):
    # with open(parsed_json_file_path, encoding='utf-8') as parsed_file:
    #     parsed_file_data = json.load(parsed_file)
    #     faction = parsed_file_data['faction']

    with open(manifest_json_file_path, encoding='utf-8') as manifest_file:
        manifest_data = json.load(manifest_file)
        for faction_data in manifest_data['pilots']:
            if faction_data['faction'] == faction:
                return faction_data['ships']
def fomat_to_xws(data_column, replacements):
    """apply formatting to card name or type"""
    for old, new in replacements.items():
        data_column = data_column.replace(old, new)
    return data_column

parsed_json_file_path: str = 'parsed.json'
manifest_json_file_path: str = '../../data/manifest.json'

replacements = {"•": "",
                "“": "",
                "”": "",
                "’": "",
                "'": "",
                '"': "",
                "–": "-",
                "(cyborg)": "",
                "(open)": "",
                "(perfected)": "",
                "(closed)": "",
                "(erratic)": "",
                "(active)": "",
                "(inactive)": "",
                "-": "",
                " ": "",
                "é": "e",
                "/": "",
                "(BoY)": "-battleofyavin",
                "(BoY SL)": "-battleofyavin",
                "(SoC)": "-siegeofcoruscant",
                "(SoC SL)": "-siegeofcoruscant",
                }

parsed_data = {'faction': 'rebelalliance', 'ships': ''}  # create an empty list to store parsed data
parsed_gather = []
# Open the CSV file in read mode
with open('X-Wing 2.0 Legacy Points document (March 23) - Rebel Alliance.csv',
          'r',
          encoding="utf8") as csvfile:
    # Create a CSV reader object with ',' as the delimiter
    csv_reader = csv.reader(csvfile, delimiter=',')

    # Loop through the rows and extract data from the 3rd and 7th columns
    for i, row in enumerate(csv_reader):
        if i == 2:
            continue  # skip the 3rd row
        # parse only rows where first column is "Standard" and column 4 is not empty
        elif row[0] == "Standard" and row[3]:
            data_type_column = row[1]
            data_name_column = row[2]
            data_points_column = row[6]
            # Apply the xws formatting to the data in the 2nd column
            data_type_column = fomat_to_xws(data_type_column, replacements).lower().strip()
            # Apply the xws formatting to the data in the 3rd column
            data_name_column = fomat_to_xws(data_name_column, replacements).lower().strip()
            # Apply the xws formatting to the data in the 7th column
            data_points_column = data_points_column.strip()




            parsed_gather.append({'ship': data_type_column, 'pilot': data_name_column,
                                  'cost': data_points_column})


# Open a new file for writing in JSON format
with open(parsed_json_file_path, 'w', encoding='UTF8') as outfile:
    # Write the parsed data list to the JSON file
    parsed_data['ships'] = parsed_gather
    json.dump(parsed_data, outfile, indent=2)


for ship_file_path in get_ships_for_faction('rebelalliance', manifest_json_file_path):
    ship_file_path = '../../' + ship_file_path
    with open(ship_file_path, 'r+', encoding='utf-8') as f:
        ship_data = json.load(f)
    with open(parsed_json_file_path, encoding='utf-8') as p:
        ship_parse_data = json.load(p)

        for pilot in ship_data["pilots"]:
            xws = pilot["xws"]
            ship = ship_data["xws"]
            # cost = pilot["cost"]
            for parsed_pilot in ship_parse_data["ships"]:
                parsed_name = parsed_pilot["pilot"]
                parsed_cost: int = parsed_pilot["cost"]
                parsed_ship = parsed_pilot['ship']
                if xws == parsed_name: # and ship_data["xws"] == parsed_pilot["ship"] :
                    # for key in ship_data["pilots"]:
                    if pilot['cost'] != parsed_cost:
                        # key['cost'] == parsed_cost
                        pilot['cost'] = int(parsed_cost)
    # open('your_' + ship +'.json', 'w', encoding='utf-8')
    with open('your_' + ship +'.json', 'a', encoding='utf-8') as outfile:
        json.dump(ship_data, outfile, indent=2)


