def update_fleet_table(connection, acid, flight_ref, model=None):
    """
    Updates (or inserts) a record in the netjets_fleet table, linking a plane (acid) with its active flight plan.
    If the model was found, then make sure the the plane's model type is up to date
    """
    if flight_ref is None or acid is None:
        return

    try:
        cursor = connection.cursor()
        if model is not None:
            sql = ("INSERT INTO netjets_fleet (acid, plane_type, flightRef) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE acid = VALUES(acid), plane_type = VALUES(plane_type), flightRef = VALUES(flightRef)")
            params = (acid, model, flight_ref)
        else:
            sql = ("INSERT INTO netjets_fleet (acid, flightRef) VALUES (%s, %s) ON DUPLICATE KEY UPDATE acid = VALUES(acid), flightRef = VALUES(flightRef)")
            params = (acid, flight_ref)

        cursor.execute(sql, params)
        connection.commit()
        cursor.close()
    except Exception as e:
        print("Error updating netjets_fleet:", e)