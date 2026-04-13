import json
import urllib.request
import os

def main():
    countries = [
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
        "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
        "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
        "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
        "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
    ]

    try:
        req = urllib.request.Request("https://restcountries.com/v3.1/all?fields=name,cca2", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            rest_data = json.loads(response.read().decode())
    except Exception as e:
        print("Failed API fetch", e)
        return

    # Map name to cca2
    name_to_code = {}
    for c in rest_data:
        n1 = c['name']['common']
        n2 = c['name']['official']
        code = c['cca2'].lower()
        name_to_code[n1] = code
        name_to_code[n2] = code

    # Custom fallbacks for API mismatches
    fallbacks = {
        "Congo (Congo-Brazzaville)": "cg",
        "Democratic Republic of the Congo": "cd",
        "Eswatini": "sz",
        "Holy See": "va",
        "Palestine State": "ps",
        "United States of America": "us",
        "Russia": "ru",
        "Syria": "sy",
        "Venezuela": "ve",
        "Vietnam": "vn",
        "South Korea": "kr",
        "North Korea": "kp",
        "Iran": "ir",
        "Laos": "la",
        "Bolivia": "bo",
        "Brunei": "bn",
        "Tanzania": "tz",
        "Cabo Verde": "cv",
        "Czechia": "cz",
        "Micronesia": "fm",
        "Moldova": "md"
    }

    os.makedirs(os.path.join("public", "flags"), exist_ok=True)
    
    new_data = []

    # Let's read existing countries.json exactly
    with open("countries.json", "r", encoding="utf-8") as f:
        existing_countries = json.load(f)

    for country in existing_countries:
        try:
            if type(country) == dict:
                cname = country.get("name")
            else:
                cname = country
        except:
            cname = country

        code = name_to_code.get(cname) or fallbacks.get(cname)
        if not code:
            for k, v in name_to_code.items():
                if cname.lower() in k.lower() or k.lower() in cname.lower():
                    code = v
                    break
        
        if not code:
            code = "un" # fallback unknown

        url = f"https://flagcdn.com/w40/{code}.png"
        filepath = os.path.join("public", "flags", f"{code}.png")
        
        if not os.path.exists(filepath) and code != "un":
            try:
                urllib.request.urlretrieve(url, filepath)
            except Exception as e:
                print(f"Failed to download {url}")
                
        new_data.append({"name": cname, "flag": f"/flags/{code}.png"})

    with open("countries.json", "w", encoding="utf-8") as f:
        json.dump(new_data, f, indent=2)

if __name__ == "__main__":
    main()
