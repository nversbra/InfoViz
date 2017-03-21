class Star:
    "The object representation of a star in our simulation"
    def __init__(self, data):
        self.id = data["id"]
        self.x = data["x"]
        self.y = data["y"]
        self.z = data["z"]
        