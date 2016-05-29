module Jekyll
  module TagHelpersFilter
    def sort_tags_by_name(tags)
      tags_only(tags).sort_by { |x| [ x[0].downcase ] }
    end

    def tags_only(tags)
      tags.select { |k, v| v.is_a? Array }
    end
  end
end

Liquid::Template.register_filter(Jekyll::TagHelpersFilter)
