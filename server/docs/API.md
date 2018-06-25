# Admin API Documentation

## Authentication
#### POST http://api-sf.novaly.ltd/login
	Params: username, password
	Response: JSON object

## Doesn't need authentication
#### GET http://api-sf.novaly.ltd/api/v1/outlets
	Params: aid (Advertiser ID)
	Response: JSON object (List of outlets for that advertiser)

#### GET http://api-sf.novaly.ltd/api/v1/advertisers
	Params:
	Response: JSON object (List of advertisers)

#### GET http://api-sf.novaly.ltd/api/v1/services
	Params: aid (Advertiser ID)
	Response: JSON object (List of services for that advertiser)

#### GET http://api-sf.novaly.ltd/api/v1/promos
	Params: aid? (Advertiser ID)
	Response: JSON object (List of promos / List of promos for that advertiser)

#### GET http://api-sf.novaly.ltd/api/v1/outlet/<outlet_id>
	Params: oid (Outlet ID)
	Response: JSON object (Info of that outlet)

#### GET http://api-sf.novaly.ltd/api/v1/advertiser/<advertiser_id>
	Params: aid (Advertiser ID)
	Response: JSON object (Info of that advertiser)

#### GET http://api-sf.novaly.ltd/api/v1/service/<service_id>
	Params: sid (Service ID)
	Response: JSON object (Info of that service)

#### GET http://api-sf.novaly.ltd/api/v1/promo/<promo_id>
	Params: oid (Promo ID)
	Response: JSON object (Info of that promo)


## Needs Authentication
#### POST http://api-sf.novaly.ltd/api/v1/outlets/add
	Params: name, address, price (...)
	Response: JSON object (Success/Failure)

#### POST http://api-sf.novaly.ltd/api/v1/advertisers/add
	Params: name, email, commission (...)
	Response: JSON object (Success/Failure)

#### POST http://api-sf.novaly.ltd/api/v1/services/add
	Params: name, type, subtype (...)
	Response: JSON object (Success/Failure)

#### POST http://api-sf.novaly.ltd/api/v1/promos/add
	Params: name, discount, deadline (...)
	Response: JSON object (Success/Failure)

#### DELETE http://api-sf.novaly.ltd/api/v1/outlet/<outlet_id>
	Params: oid (Outlet ID)
	Response: JSON object (Success/Failure)

#### DELETE http://api-sf.novaly.ltd/api/v1/advertiser/<advertiser_id>
	Params: aid (Advertiser ID)
	Response: JSON object (Success/Failure)

#### DELETE http://api-sf.novaly.ltd/api/v1/service/<service_id>
	Params: sid (Service ID)
	Response: JSON object (Success/Failure)

#### DELETE http://api-sf.novaly.ltd/api/v1/promo/<promo_id>
	Params: pid (Promo ID)
	Response: JSON object (Success/Failure)