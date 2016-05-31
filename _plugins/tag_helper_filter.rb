module Jekyll
  module TagHelpersFilter
    def sorted_tags(tags)
      tags.keys.sort_by! { |tag| tag.downcase }
    end

    def exclude_special(tags)
      tags.select { |t| t != 'type' && t != 'path'}
    end
  end
end

Liquid::Template.register_filter(Jekyll::TagHelpersFilter)
