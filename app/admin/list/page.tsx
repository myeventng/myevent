import EventList from '@/components/section/EventList';
import CategoryList from '@/components/section/CategoryList';
import CityList from '@/components/section/CityList';
import VenueList from '@/components/section/VenueList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const page = () => {
  return (
    <div className="w-full">
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="flex gap-3 justify-start items-center">
          <TabsTrigger value="events" className=" bg-white">
            Event
          </TabsTrigger>
          <TabsTrigger value="category" className=" bg-white">
            Category
          </TabsTrigger>
          <TabsTrigger value="city" className=" bg-white">
            City
          </TabsTrigger>
          <TabsTrigger value="venue" className=" bg-white">
            Venue
          </TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <EventList />
        </TabsContent>
        <TabsContent value="category">
          <CategoryList />
        </TabsContent>
        <TabsContent value="city">
          <CityList />
        </TabsContent>
        <TabsContent value="venue">
          <VenueList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default page;
