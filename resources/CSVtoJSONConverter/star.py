class Star:
    "The object representation of a star in our simulation"
    def __init__(self, data):
        # self.id = data["id"]
        self.x = "{0:.6f}".format(float(data["x"])/100000000000000)
        self.y = "{0:.6f}".format(float(data["y"])/100000000000000)
        self.z = "{0:.6f}".format(float(data["z"])/100000000000000)
        