const API_key = "17b293469e4304dc876f2452d019e0a3";

const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

let selectedCity;
let selectedCityText;

const getCities=async (searchText)=>{
  const response=await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_key}`);
  return response.json();
}

const getCurrentWeather =async({lat, lon, name:city})=>{
    const url=lat && lon?`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_key}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_key}&units=metric`;
    const response=await fetch(url); 
    return response.json()
}

const getHourlyForecast =async({name:city})=>{
  const response= await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_key}`);
  const data=await response.json();
  return data.list.map(forecast=>{
    const{main:{temp,temp_max,temp_min},dt,dt_txt,weather:[{description,icon}]}=forecast;
    return{temp,temp_max,temp_min,dt,dt_txt,description,icon}
  })
}

const formatTemperature=(temp)=>`${temp?.toFixed(2)}°C`;
const iconCreator=(icon)=>` https://openweathermap.org/img/wn/${icon}@2x.png`;

const loadCurrentForecast=({name,main:{temp,temp_max,temp_min},weather:[{description,icon}]})=>{
    const currentForecastElement=document.querySelector("#current-forecast .temp-curr");
    currentForecastElement.querySelector(".city-name").textContent= name;
    currentForecastElement.querySelector(".current-temp").textContent=formatTemperature(temp);
    currentForecastElement.querySelector(".description").textContent=description;
    currentForecastElement.querySelector(".min-max").textContent=`High: ${temp_max} Low: ${temp_min}`;

    const currentForecastIcon=document.querySelector("#current-forecast .curr-icon");
    currentForecastIcon.querySelector(".icon").src=iconCreator(icon);
}

const loadHourlyForecast=({main:{temp:tempNow},weather:[{icon:iconNow}]},hourlyForecast)=>{
    console.log(hourlyForecast);
    const timeFormatter=Intl.DateTimeFormat("en",{
      hour12:true,hour:"numeric"
    })
    let dataFor12hrs=hourlyForecast.slice(2,14); 
    const hourlyContainer=document.querySelector(".hourly-container");
    let innerHTMLStr=`<article>
        <h2 class="time">Now</h2>
        <img class="icon" src="${iconCreator(iconNow)}"/>
        <p class="hourly-temp">${formatTemperature(tempNow)}</p>
      </article>`;

    for(let {temp, icon ,dt_txt}of dataFor12hrs){

      innerHTMLStr +=`<article>
      <h2 class="time">${timeFormatter.format(new Date(dt_txt))}</h2>
      <img class="icon" src="${iconCreator(icon)}"/>
      <p class="hourly-temp">${formatTemperature(temp-273.15)}</p>
    </article>`
    }
    hourlyContainer.innerHTML=innerHTMLStr;
}

const calcDayWiseForecast=(hourlyForecast)=>{
  let dayWiseForecast=new Map();
  for(let forecast of hourlyForecast){
    const [date]=forecast.dt_txt.split(" ");
    const days=DAYS[new Date(date).getDay()]
    console.log(days);
    if(dayWiseForecast.has(days)){
      let forecastForTheDay=dayWiseForecast.get(days);
      forecastForTheDay.push(forecast);
      dayWiseForecast.set(days,forecastForTheDay);
    }
    else{
      dayWiseForecast.set(days,[forecast]);
    }
  }
  console.log(dayWiseForecast);
  for(let [key,value]of dayWiseForecast){
    let temp_min=Math.min(...Array.from(value,val=>val.temp_min))-273.15;
    let temp_max=Math.max(...Array.from(value,val=>val.temp_max))-273.15;
    dayWiseForecast.set(key,{temp_min,temp_max,icon:value.find(v=>v.icon).icon})
  }
  console.log(dayWiseForecast);
  return dayWiseForecast;
}
const loadFiveDayForecast=(hourlyForecast)=>{
  console.log(hourlyForecast)
  const dayWiseForecast=calcDayWiseForecast(hourlyForecast);
  const container=document.querySelector("#five-day-container");
  let dayWiseInfo="";
  Array.from(dayWiseForecast).map(([key,{temp_max,temp_min,icon}],index)=>{
    
    if(index<5){
      dayWiseInfo+=`<article class="five-day-forecast">
                      <h3>${index==0? "Today":key}</h3>
                      <img class="icon" src="${iconCreator(icon)}" alt="icon of the forecast">
                      <p class="min-temp">${formatTemperature(temp_min)}</p>
                      <p class="max-temp">${formatTemperature(temp_max)}</p>
                  </article>`;
    }
  });
 
  container.innerHTML=dayWiseInfo;

}

const loadFeelsLike=({main:{feels_like}})=>{
  let container = document.querySelector("#feels-like");
  container.querySelector(".feels-like-temp").textContent =formatTemperature(feels_like);
}

const loadHumidity=({main:{humidity}})=>{
  let container = document.querySelector("#humidity");
  container.querySelector(".humidity-val").textContent =`${humidity} %`;
}

const loadData=async()=>{
  const currentWeather= await getCurrentWeather(selectedCity);
  loadCurrentForecast(currentWeather)
  const hourlyForecast=await getHourlyForecast(currentWeather);
  loadHourlyForecast(currentWeather,hourlyForecast)
  loadFiveDayForecast(hourlyForecast);
  loadFeelsLike(currentWeather);
  loadHumidity(currentWeather);
}

function debounce(func){
  let timer;
  return(...args)=>{
    clearTimeout(timer);

    timer=setTimeout(()=>{
      func.apply(this,args)
    },500);
  }
}

const onSearch=async(event)=>{
  let { value }=event.target;
  if(!value){
    selectedCity=null;
    selectedCityText="";
  }
  if(value && (selectedCityText !==value)){
    const listOfCities=await getCities(value);
    let options ="";
    for(let {lat,lon,name,state,country}of listOfCities){
      options +=`<option data-city-details='${JSON.stringify({lat,lon,name})}'value="${name},${state},${country}"></option>`
    }
    document.querySelector("#cities").innerHTML=options;
    console.log(listOfCities);
    
  }
}

const loadForecast=()=>{
  navigator.geolocation.getCurrentPosition(({coords})=>{
    const {latitude:lat, longitude:lon}=coords;
    selectedCity={lat,lon};
    loadData();
  },error=>console.log(error))
}

const handleCity=(event)=>{
  selectedCityText=event.target.value;
  let options=document.querySelectorAll("#cities > option");
  if(options?.length){
    let selectedOption=Array.from(options).find(opt=>opt.value===selectedCityText);
    selectedCity=JSON.parse(selectedOption.getAttribute("data-city-details"));
    console.log({selectedCity});
    loadData();
  }
}

const debounceSearch=debounce((event)=>onSearch(event))

document.addEventListener("DOMContentLoaded",async() =>{
  loadForecast();
  const searchInput= document.querySelector("#search");
  searchInput.addEventListener("input",debounceSearch);
  searchInput.addEventListener("change",handleCity)
  

  /*change background*/
  
  const time=new Date();

  let hours=time.getHours();

  if(hours>6 && hours<=16)
  {
    document.getElementById("body").classList.remove("night")
    document.getElementById("body").classList.remove("dawn")
    document.getElementById("body").classList.add("day")
  }
  else if(hours>=4 && hours<6 || hours>16 && hours<=18)
  {
    document.getElementById("body").classList.remove("night")
    document.getElementById("body").classList.remove("day")
    document.getElementById("body").classList.add("dawn")
  }
  else
  {
    document.getElementById("body").classList.remove("day")
    document.getElementById("body").classList.remove("dawn")
    document.getElementById("body").classList.add("night")
  }
})