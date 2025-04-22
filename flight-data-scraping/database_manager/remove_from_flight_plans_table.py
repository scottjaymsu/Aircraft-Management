def remove_from_flight_plans_table(connection, flight_ref):
    """
    Removes a flight plan from the flight_plans table based on the flight_ref.
    """

    sql = "DELETE FROM flight_plans WHERE flightRef = %s"
    params = [flight_ref]

    try:
        cursor = connection.cursor()
        cursor.execute(sql, tuple(params))
        connection.commit()
        cursor.close()
    except Exception as e:
        print("Error deleting from flight_plans:", e)